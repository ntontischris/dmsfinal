import { GoogleApiError, type GoogleCalendarApi } from "./client";
import { toGoogleEventBody } from "./event-body";
import { describeError } from "./describe-error";
import { claimOutbox, finishOutbox, type WorkerClient } from "./rpc";
import type { ClaimItem, GoogleEventBody, GoogleEventWrite, QueuedEvent } from "./schemas";

// Η ουρά προς το Google: παίρνει παρτίδα, κάνει την κλήση για κάθε γραμμή και γράφει το αποτέλεσμα πίσω.
// Το νέο γεγονός παίρνει ως id το uuid της οντότητας (χωρίς παύλες): μια επανάληψη μετά από διακοπή
// δεν δημιουργεί διπλό, γιατί το 409 γίνεται ενημέρωση. Μετά το όριο χρόνου δεν παίρνουμε νέα γραμμές.
export interface PushContext {
  client: WorkerClient;
  api: GoogleCalendarApi;
  calendarId: string;
  origin: string;
  deadline: number;
}

const GONE_STATUSES = new Set([404, 410]);
const PERMANENT_STATUSES = new Set([400, 403, 404]);

const statusOf = (error: unknown): number | null => (error instanceof GoogleApiError ? error.status : null);
const isStatus = (error: unknown, statuses: Set<number>): boolean => {
  const status = statusOf(error);
  return status !== null && statuses.has(status);
};
const stableEventId = (entityId: string): string => entityId.replaceAll("-", "").toLowerCase();

async function insertWithStableId(ctx: PushContext, entityId: string, body: GoogleEventBody): Promise<GoogleEventWrite> {
  const id = stableEventId(entityId);
  try {
    return await ctx.api.insertEvent(ctx.calendarId, { ...body, id });
  } catch (error) {
    if (statusOf(error) !== 409) throw error;
    return ctx.api.patchEvent(ctx.calendarId, id, body);
  }
}

// Ενημέρωση αν υπάρχει γεγονός· αν το Google το έχει σβήσει (404/410), νέο γεγονός με δικό του αναγνωριστικό.
async function writeEvent(ctx: PushContext, item: ClaimItem, event: QueuedEvent): Promise<GoogleEventWrite> {
  const body = toGoogleEventBody(event, ctx.origin);
  if (!item.eventId) return insertWithStableId(ctx, item.entityId, body);
  try {
    return await ctx.api.patchEvent(ctx.calendarId, item.eventId, body);
  } catch (error) {
    if (!isStatus(error, GONE_STATUSES)) throw error;
    return ctx.api.insertEvent(ctx.calendarId, body);
  }
}

// Ένα μόνο αντικείμενο: ό,τι δεν χρειάζεται κλήση τελειώνει χωρίς αυτήν.
async function pushItem(ctx: PushContext, item: ClaimItem): Promise<void> {
  if (item.op === "delete") {
    if (item.eventId) await ctx.api.deleteEvent(ctx.calendarId, item.eventId);
    return finishOutbox(ctx.client, { id: item.id, eventId: null });
  }
  if (!item.event) return finishOutbox(ctx.client, { id: item.id, eventId: null });
  const written = await writeEvent(ctx, item, item.event);
  return finishOutbox(ctx.client, { id: item.id, eventId: written.id, etag: written.etag });
}

// Σφάλμα μιας γραμμής δεν σταματά την παρτίδα. Μόνιμο σφάλμα κλείνει τη γραμμή· αλλιώς οπισθοχωρεί.
async function pushOne(ctx: PushContext, item: ClaimItem): Promise<void> {
  try {
    await pushItem(ctx, item);
  } catch (error) {
    console.error("google push", item.entity, describeError(error));
    await finishOutbox(ctx.client, {
      id: item.id,
      error: describeError(error),
      permanent: isStatus(error, PERMANENT_STATUSES),
    });
  }
}

// Επιστρέφει πόσες γραμμές δοκιμάστηκαν. Μετά το όριο δεν παίρνει ούτε νέα παρτίδα.
export async function pushOutbox(ctx: PushContext, limit = 25): Promise<number> {
  if (Date.now() >= ctx.deadline) return 0;
  const items = await claimOutbox(ctx.client, limit);
  let attempted = 0;
  for (const item of items) {
    if (Date.now() >= ctx.deadline) break;
    await pushOne(ctx, item);
    attempted += 1;
  }
  return attempted;
}
