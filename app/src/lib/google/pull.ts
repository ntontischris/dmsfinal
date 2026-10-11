import { GoogleApiError, type ChangesQuery, type GoogleCalendarApi } from "./client";
import { describeError } from "./describe-error";
import { applyChange, noteEventError, setSyncToken, type WorkerClient } from "./rpc";
import { parseGoogleEvent, type GoogleEvent, type GoogleListPage } from "./schemas";

// Αυξητικός συγχρονισμός από το Google: κάθε σελίδα περνά ολόκληρη, και το syncToken γράφεται μόνο στο τέλος.
// Η πλήρης ανάγνωση γίνεται ΧΩΡΙΣ timeMin: μόνο έτσι η τελευταία σελίδα επιστρέφει nextSyncToken (N5, το ημερολόγιο είναι δικό μας και μικρό).
// Αν το token έχει λήξει (410), γίνεται πλήρη ανάγνωση και νέο token.

export interface PullContext {
  client: WorkerClient;
  api: GoogleCalendarApi;
  calendarId: string;
  syncToken: string | null;
  deadline: number;
}

export type PullResult = "complete" | "partial";

const RESET = Symbol("reset");

// Η μορφή του γεγονότος που περιμένει η βάση (google_apply_change). Ο τίτλος του Google δεν φεύγει από εδώ.
export function toApplyInput(event: GoogleEvent): Record<string, unknown> {
  const allDay = event.start?.dateTime === undefined && event.start?.date !== undefined;
  return {
    id: event.id,
    status: event.status ?? "confirmed",
    etag: event.etag ?? null,
    start: event.start?.dateTime ?? event.start?.date ?? null,
    end: event.end?.dateTime ?? event.end?.date ?? null,
    allDay,
    attendees: (event.attendees ?? []).flatMap((attendee) => (attendee.email ? [attendee.email] : [])),
    organizer: event.organizer?.email ?? null,
    recurring: event.recurringEventId !== undefined || (event.recurrence?.length ?? 0) > 0,
  };
}

// Σφάλμα ενός γεγονότος δεν σταματά τη σελίδα: καταγράφεται με το id του γεγονότος, χωρίς τιμές.
async function applyEvent(ctx: PullContext, event: GoogleEvent): Promise<void> {
  try {
    await applyChange(ctx.client, toApplyInput(event));
  } catch (error) {
    const reason = describeError(error);
    console.error("google pull", reason);
    await noteEventError(ctx.client, event.id, reason).catch(() => console.error("google pull: η καταγραφή απέτυχε"));
  }
}

async function applyPage(ctx: PullContext, page: GoogleListPage): Promise<void> {
  for (const raw of page.items) {
    const event = parseGoogleEvent(raw);
    if (event) await applyEvent(ctx, event);
  }
}

async function listOrReset(ctx: PullContext, query: ChangesQuery): Promise<GoogleListPage | typeof RESET> {
  try {
    return await ctx.api.listChanges(query);
  } catch (error) {
    if (error instanceof GoogleApiError && error.status === 410 && query.syncToken) return RESET;
    throw error;
  }
}

const startCursor = (ctx: PullContext): ChangesQuery =>
  ctx.syncToken
    ? { calendarId: ctx.calendarId, syncToken: ctx.syncToken }
    : { calendarId: ctx.calendarId };

// Σελίδες ως το τέλος ή ως το όριο χρόνου. Χωρίς τέλος, το token δεν γράφεται και ο επόμενος γύρος ξαναρχίζει.
export async function pullChanges(ctx: PullContext): Promise<PullResult> {
  let query = startCursor(ctx);
  for (;;) {
    if (Date.now() >= ctx.deadline) return "partial";
    const page = await listOrReset(ctx, query);
    if (page === RESET) {
      query = { calendarId: ctx.calendarId };
      continue;
    }
    await applyPage(ctx, page);
    if (page.nextPageToken) {
      query = { ...query, pageToken: page.nextPageToken };
      continue;
    }
    if (page.nextSyncToken) await setSyncToken(ctx.client, page.nextSyncToken);
    return "complete";
  }
}
