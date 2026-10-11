import { GoogleApiError, type GoogleCalendarApi } from "./client";
import { toGoogleEventBody } from "./event-body";
import { describeError } from "./describe-error";
import { claimOutbox, finishOutbox, type WorkerClient } from "./rpc";
import type { ClaimItem, QueuedEvent } from "./schemas";

// Η ουρά προς το Google: παίρνει παρτίδα, κάνει την κλήση για κάθε γραμμή και γράφει το αποτέλεσμα πίσω.
export interface PushContext {
  client: WorkerClient;
  api: GoogleCalendarApi;
  calendarId: string;
  origin: string;
}

const GONE_STATUSES = new Set([404, 410]);

// Ενημέρωση αν υπάρχει γεγονός· αν το Google το έχει σβήσει (404/410), νέο γεγονός.
async function writeEvent(ctx: PushContext, eventId: string | null, event: QueuedEvent) {
  const body = toGoogleEventBody(event, ctx.origin);
  if (eventId) {
    try {
      return await ctx.api.patchEvent(ctx.calendarId, eventId, body);
    } catch (error) {
      if (!(error instanceof GoogleApiError && GONE_STATUSES.has(error.status))) throw error;
    }
  }
  return ctx.api.insertEvent(ctx.calendarId, body);
}

// Ένα μόνο αντικείμενο: ό,τι δεν χρειάζεται κλήση τελειώνει χωρίς αυτήν.
async function pushItem(ctx: PushContext, item: ClaimItem): Promise<void> {
  if (item.op === "delete") {
    if (item.eventId) await ctx.api.deleteEvent(ctx.calendarId, item.eventId);
    return finishOutbox(ctx.client, { id: item.id, eventId: null });
  }
  if (!item.event) return finishOutbox(ctx.client, { id: item.id, eventId: null });
  const written = await writeEvent(ctx, item.eventId, item.event);
  return finishOutbox(ctx.client, { id: item.id, eventId: written.id, etag: written.etag });
}

// Σφάλμα μιας γραμμής δεν σταματά την παρτίδα· η γραμμή οπισθοχωρεί στη βάση.
async function pushOne(ctx: PushContext, item: ClaimItem): Promise<void> {
  try {
    await pushItem(ctx, item);
  } catch (error) {
    console.error("google push", item.entity, describeError(error));
    await finishOutbox(ctx.client, { id: item.id, error: describeError(error) });
  }
}

export async function pushOutbox(ctx: PushContext, limit = 25): Promise<number> {
  const items = await claimOutbox(ctx.client, limit);
  for (const item of items) await pushOne(ctx, item);
  return items.length;
}
