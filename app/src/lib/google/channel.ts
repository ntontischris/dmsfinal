import { createHash, randomBytes, randomUUID } from "node:crypto";

import type { GoogleCalendarApi } from "./client";
import { setChannel, type WorkerClient } from "./rpc";
import type { GoogleState } from "./schemas";

// Κανάλι ειδοποιήσεων: το Google χτυπά το webhook όταν αλλάζει το ημερολόγιο. Ανανεώνεται όταν λήγει σε λιγότερο από 24 ώρες.
export const CHANNEL_PATH = "/api/hooks/google-calendar";
const RENEW_MARGIN_MS = 24 * 60 * 60 * 1000;

export type ChannelOutcome = "kept" | "renewed" | "skipped";

export interface ChannelContext {
  client: WorkerClient;
  api: GoogleCalendarApi;
  calendarId: string;
  origin: string;
  state: GoogleState;
  now: number;
}

export const sha256Hex = (value: string): string => createHash("sha256").update(value).digest("hex");

// Η ειδοποίηση θέλει https· σε τοπικό περιβάλλον το κανάλι μένει ανενεργό και ο έλεγχος κάθε λεπτό κρατά τα δεδομένα.
const isHttps = (origin: string): boolean => origin.startsWith("https://");

export function isChannelFresh(state: GoogleState, now: number): boolean {
  if (!state.channelId || !state.channelExpiresAt) return false;
  return Date.parse(state.channelExpiresAt) - now > RENEW_MARGIN_MS;
}

async function stopPreviousChannel(ctx: ChannelContext): Promise<void> {
  const { channelId, channelResourceId } = ctx.state;
  if (!channelId || !channelResourceId) return;
  await ctx.api.stopChannel({ id: channelId, resourceId: channelResourceId }).catch(() => {
    console.error("google channel: το παλιό κανάλι δεν σταμάτησε");
  });
}

export async function ensureChannel(ctx: ChannelContext): Promise<ChannelOutcome> {
  if (!isHttps(ctx.origin)) return "skipped";
  if (isChannelFresh(ctx.state, ctx.now)) return "kept";
  const token = randomBytes(32).toString("base64url");
  const watch = await ctx.api.watchEvents({
    calendarId: ctx.calendarId,
    address: `${ctx.origin}${CHANNEL_PATH}`,
    token,
    id: randomUUID(),
  });
  const expiresAt = new Date(Number(watch.expiration));
  if (Number.isNaN(expiresAt.getTime())) throw new Error("google watch: μη έγκυρη λήξη");
  await setChannel(ctx.client, {
    channelId: watch.id,
    tokenHash: sha256Hex(token),
    resourceId: watch.resourceId,
    expiresAt: expiresAt.toISOString(),
  });
  await stopPreviousChannel(ctx);
  return "renewed";
}
