import { isGoogleConfigured } from "./config";
import type { GoogleCalendarApi } from "./client";
import { describeError } from "./describe-error";
import { ensureChannel, type ChannelOutcome } from "./channel";
import { pullChanges, type PullResult } from "./pull";
import { pushOutbox } from "./push";
import {
  acquireWorker,
  expireDeletions,
  markSync,
  pruneActivity,
  readGoogleState,
  releaseWorker,
  type WorkerClient,
} from "./rpc";
import type { GoogleState } from "./schemas";

// Ο εργάτης του Google: ένας γύρος κάθε φορά (κλείδωμα στη βάση). Κάθε βήμα έχει δικό του try/catch,
// ώστε η αποτυχία του ενός να μη σταματά τα άλλα. Ο αυξητικός συγχρονισμός τρέχει κάθε 15 λεπτά ή όταν ζητηθεί.
export const PULL_INTERVAL_MS = 15 * 60 * 1000;
export const LEASE_SECONDS = 90;

export interface WorkerOptions {
  origin: string;
  forcePull: boolean;
  budgetMs: number;
}

export type SkipReason = "not-configured" | "no-calendar" | "busy";

export interface WorkerSummary {
  skipped?: SkipReason;
  pushed: number;
  pulled: PullResult | "skipped" | "failed";
  channel: ChannelOutcome | "failed";
  expired: number;
}

const SKIPPED = (reason: SkipReason): WorkerSummary => ({
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
  if (forcePull || state.pullRequested || !state.lastSyncAt) return true;
  return now - Date.parse(state.lastSyncAt) >= PULL_INTERVAL_MS;
}

async function runPull(
  client: WorkerClient,
  api: GoogleCalendarApi,
  state: GoogleState,
  calendarId: string,
  deadline: number,
): Promise<PullResult | "failed"> {
  const result = await attempt(client, "Ο συγχρονισμός", () =>
    pullChanges({ client, api, calendarId, syncToken: state.syncToken, deadline }),
  );
  if (result === "complete") await markSync(client, true);
  return result ?? "failed";
}

// Λήξη διαγραφών και καθαρισμός παλιάς δραστηριότητας (90 μέρες).
async function runHousekeeping(client: WorkerClient): Promise<number> {
  const expired = await attempt(client, "Οι διαγραφές", () => expireDeletions(client));
  await attempt(client, "Η καθαριότητα", () => pruneActivity(client));
  return expired ?? 0;
}

// Τα βήματα του γύρου, με κοινό όριο χρόνου: ουρά, συγχρονισμός, κανάλι, λήξεις.
async function runLeasedRound(client: WorkerClient, api: GoogleCalendarApi, options: WorkerOptions): Promise<WorkerSummary> {
  const state = await readGoogleState(client);
  if (!state.calendarId) return SKIPPED("no-calendar");
  const calendarId = state.calendarId;
  const deadline = Date.now() + options.budgetMs;
  const pushed = await attempt(client, "Η ουρά", () =>
    pushOutbox({ client, api, calendarId, origin: options.origin, deadline }),
  );
  const pulled = shouldPull(state, options.forcePull, Date.now())
    ? await runPull(client, api, state, calendarId, deadline)
    : "skipped";
  const channel = await attempt(client, "Το κανάλι ειδοποιήσεων", () =>
    ensureChannel({ client, api, calendarId, origin: options.origin, state, now: Date.now() }),
  );
  const expired = await runHousekeeping(client);
  return { pushed: pushed ?? 0, pulled, channel: channel ?? "failed", expired };
}

// Ο γύρος τρέχει μόνο όταν πάρει το κλείδωμα· αλλιώς τον κάνει ήδη άλλος γύρος (cron ή «Συγχρόνισε τώρα»).
export async function runGoogleWorker(
  client: WorkerClient,
  api: GoogleCalendarApi,
  options: WorkerOptions,
): Promise<WorkerSummary> {
  if (!isGoogleConfigured()) return SKIPPED("not-configured");
  if (!(await acquireWorker(client, LEASE_SECONDS))) return SKIPPED("busy");
  try {
    return await runLeasedRound(client, api, options);
  } finally {
    await releaseWorker(client).catch(() => console.error("google worker: το κλείδωμα δεν αφέθηκε"));
  }
}
