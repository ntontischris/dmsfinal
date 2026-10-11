import type { SupabaseClient } from "@supabase/supabase-js";
import { z } from "zod";

import {
  claimListSchema,
  googleStateSchema,
  type ClaimItem,
  type GoogleState,
} from "./schemas";

// Οι RPC του worker (μόνο service role). Κάθε κλήση ελέγχει το σφάλμα· η αποτυχία φτάνει ως Error με μήνυμα της βάσης.
// Ο τύπος του client εισάγεται μόνο ως τύπος: ο κανόνας check:modules επιτρέπει το service role σε συγκεκριμένα αρχεία.
export type WorkerClient = SupabaseClient;

async function callWorker(client: WorkerClient, name: string, args: Record<string, unknown> = {}): Promise<unknown> {
  const { data, error } = await client.rpc(name, args);
  if (error) throw new Error(`${name}: ${error.message}`);
  return data;
}

export async function readGoogleState(client: WorkerClient): Promise<GoogleState> {
  return googleStateSchema.parse(await callWorker(client, "google_state"));
}

export async function setCalendar(client: WorkerClient, calendarId: string, sharedWith: string): Promise<void> {
  await callWorker(client, "google_set_calendar", { p_calendar_id: calendarId, p_shared_with: sharedWith });
}

export interface ChannelRecord {
  channelId: string;
  tokenHash: string;
  resourceId: string;
  expiresAt: string;
}

export async function setChannel(client: WorkerClient, channel: ChannelRecord): Promise<void> {
  await callWorker(client, "google_set_channel", {
    p_channel_id: channel.channelId,
    p_token_hash: channel.tokenHash,
    p_resource_id: channel.resourceId,
    p_expires_at: channel.expiresAt,
  });
}

export async function setSyncToken(client: WorkerClient, token: string): Promise<void> {
  await callWorker(client, "google_set_sync_token", { p_token: token });
}

// Επιτυχία καθαρίζει το σφάλμα· αποτυχία κρατά το μήνυμα (χωρίς τιμές, μόνο κωδικοί).
export async function markSync(client: WorkerClient, ok: boolean, error = ""): Promise<void> {
  await callWorker(client, "google_mark_sync", { p_ok: ok, p_error: ok ? null : error });
}

export async function isChannelValid(client: WorkerClient, channelId: string, token: string): Promise<boolean> {
  return z.boolean().parse(await callWorker(client, "google_channel_check", { p_channel_id: channelId, p_token: token }));
}

export async function claimOutbox(client: WorkerClient, limit: number): Promise<ClaimItem[]> {
  return claimListSchema.parse(await callWorker(client, "google_outbox_claim", { p_limit: limit }));
}

// Αποτέλεσμα της κλήσης: μη κενό μήνυμα σημαίνει αποτυχία (οπισθοχώρηση)· κενό ή null σημαίνει επιτυχία.
export interface OutboxResult {
  id: number;
  eventId?: string | null;
  etag?: string | null;
  error?: string;
}

export async function finishOutbox(client: WorkerClient, result: OutboxResult): Promise<void> {
  await callWorker(client, "google_outbox_done", {
    p_id: result.id,
    p_event_id: result.eventId ?? null,
    p_etag: result.etag ?? null,
    p_error: result.error ? result.error : null,
  });
}

export async function applyChange(client: WorkerClient, event: Record<string, unknown>): Promise<string> {
  const data = await callWorker(client, "google_apply_change", { p_event: event });
  return z.object({ action: z.string() }).parse(data).action;
}

export async function expireDeletions(client: WorkerClient): Promise<number> {
  return z.number().parse(await callWorker(client, "google_expire_deletions"));
}
