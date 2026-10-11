import { GoogleApiError, type ChangesQuery, type GoogleCalendarApi } from "./client";
import { setSyncToken, applyChange, type WorkerClient } from "./rpc";
import { parseGoogleEvent, type GoogleEvent, type GoogleListPage } from "./schemas";

// Αυξητικός συγχρονισμός από το Google: κάθε σελίδα περνά ολόκληρη, και το syncToken γράφεται μόνο στο τέλος.
// Αν το token έχει λήξει (410), γίνεται πλήρης ανάγνωση των τελευταίων 60 ημερών.
export const LOOKBACK_DAYS = 60;
const DAY_MS = 86_400_000;

export interface PullContext {
  client: WorkerClient;
  api: GoogleCalendarApi;
  calendarId: string;
  syncToken: string | null;
  now: number;
  deadline: number;
}

export type PullResult = "complete" | "partial";

const RESET = Symbol("reset");

const fullReadCursor = (now: number): ChangesQuery["timeMin"] =>
  new Date(now - LOOKBACK_DAYS * DAY_MS).toISOString();

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

async function applyPage(ctx: PullContext, page: GoogleListPage): Promise<void> {
  for (const raw of page.items) {
    const event = parseGoogleEvent(raw);
    if (event) await applyChange(ctx.client, toApplyInput(event));
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
    : { calendarId: ctx.calendarId, timeMin: fullReadCursor(ctx.now) };

// Σελίδες ως το τέλος ή ως το όριο χρόνου. Χωρίς τέλος, το token δεν γράφεται και ο επόμενος γύρος ξαναρχίζει.
export async function pullChanges(ctx: PullContext): Promise<PullResult> {
  let query = startCursor(ctx);
  for (;;) {
    if (Date.now() >= ctx.deadline) return "partial";
    const page = await listOrReset(ctx, query);
    if (page === RESET) {
      query = { calendarId: ctx.calendarId, timeMin: fullReadCursor(ctx.now) };
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
