import { isGoogleConfigured } from "./config";
import type { GoogleCalendarApi } from "./client";
import { describeError } from "./describe-error";
import { ensureChannel, type ChannelOutcome } from "./channel";
import { pullChanges, type PullResult } from "./pull";
import { pushOutbox } from "./push";
import { expireDeletions, markSync, readGoogleState, type WorkerClient } from "./rpc";
import type { GoogleState } from "./schemas";

// Ο εργάτης του Google: κάθε γύρος κάνει τα βήματα με δικό του try/catch, ώστε η αποτυχία του ενός να μη σταματά τα άλλα.
// Ο αυξητικός συγχρονισμός τρέχει όταν πέρασαν 15 λεπτά από τον τελευταίο, ή αμέσως όταν το ζητά ειδοποίηση ή ο Χρήστης.
export const PULL_INTERVAL_MS = 15 * 60 * 1000;

export interface WorkerOptions {
  origin: string;
  forcePull: boolean;
  budgetMs: number;
}

export interface WorkerSummary {
  skipped?: "not-configured" | "no-calendar";
  pushed: number;
  pulled: PullResult | "skipped" | "failed";
  channel: ChannelOutcome | "failed";
  expired: number;
}

const SKIPPED = (reason: "not-configured" | "no-calendar"): WorkerSummary => ({
  skipped: reason,
  pushed: 0,
  pulled: "skipped",
  channel: "skipped",
  expired: 0,
});

// Σφάλμα βήματος: καταγράφεται (χωρίς τιμές) και γράφεται ως τελευταίο σφάλμα συγχρονισμού.
async function attempt<T>(client: WorkerClient, label: string, work: () => Promise<T>): Promise<T | null> {
  try {
    return await work();
  } catch (error) {
    const message = `${label}: ${describeError(error)}`;
    console.error("google worker", message);
    await markSync(client, false, message).catch(() => console.error("google worker: η κατάσταση δεν γράφτηκε"));
    return null;
  }
}

export function shouldPull(state: GoogleState, forcePull: boolean, now: number): boolean {
  if (forcePull || !state.lastSyncAt) return true;
  return now - Date.parse(state.lastSyncAt) >= PULL_INTERVAL_MS;
}

async function runPull(
  client: WorkerClient,
  api: GoogleCalendarApi,
  state: GoogleState,
  calendarId: string,
  options: WorkerOptions,
): Promise<PullResult | "failed"> {
  const now = Date.now();
  const result = await attempt(client, "Ο συγχρονισμός", () =>
    pullChanges({ client, api, calendarId, syncToken: state.syncToken, now, deadline: now + options.budgetMs }),
  );
  if (result === "complete") await markSync(client, true);
  return result ?? "failed";
}

// Τα βήματα του γύρου: a (κατάσταση), b (ουρά), c (συγχρονισμός), d (κανάλι), e (λήξη διαγραφών).
export async function runGoogleWorker(
  client: WorkerClient,
  api: GoogleCalendarApi,
  options: WorkerOptions,
): Promise<WorkerSummary> {
  if (!isGoogleConfigured()) return SKIPPED("not-configured");
  const state = await readGoogleState(client);
  if (!state.calendarId) return SKIPPED("no-calendar");
  const calendarId = state.calendarId;

  const pushed = await attempt(client, "Η ουρά", () => pushOutbox({ client, api, calendarId, origin: options.origin }));
  const pulled = shouldPull(state, options.forcePull, Date.now())
    ? await runPull(client, api, state, calendarId, options)
    : "skipped";
  const channel = await attempt(client, "Το κανάλι ειδοποιήσεων", () =>
    ensureChannel({ client, api, calendarId, origin: options.origin, state, now: Date.now() }),
  );
  const expired = await attempt(client, "Οι διαγραφές", () => expireDeletions(client));

  return {
    pushed: pushed ?? 0,
    pulled,
    channel: channel ?? "failed",
    expired: expired ?? 0,
  };
}
