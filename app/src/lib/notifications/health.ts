import type { SupabaseClient } from "@supabase/supabase-js";
import { z } from "zod";

// Υγεία (#174, Α14): κάθε cron γράφει πότε ξεκίνησε και αν πέτυχε (job_runs) και ελέγχει το άλλο cron, το Google και τα
// κολλημένα Γεγονότα (Γεγονότα 50–53). Το cron της ουράς σβήνει και ό,τι πέρασε τους 12 μήνες στο Ιστορικό αποστολών.
// Κανένα σφάλμα εδώ δεν σταματά τη δουλειά του cron: καταγράφεται μόνο το μήνυμα της βάσης.

export type JobName = "outbox" | "google";
// Βήματα του cron της ουράς που γράφουν μόνα τους πότε έτρεξαν (#215): η Υγεία τα δείχνει ως χωριστές εργασίες.
export type StepJob =
  | "events_process"
  | "automations_scan"
  | "billables"
  | "sends_cleanup";

const healthSchema = z.object({
  jobs: z.number(),
  google: z.number(),
  events: z.number(),
});
// Ο καθαρισμός τρέχει μία φορά τη μέρα (03:xx Αθήνας)· τις άλλες φορές απαντά «skipped».
const cleanupSchema = z.union([
  z.object({ sends: z.number(), logs: z.number(), outbox: z.number() }),
  z.object({ skipped: z.literal(true) }),
]);

export type HealthOutcome = z.infer<typeof healthSchema> | { error: string };
export type CleanupOutcome = z.infer<typeof cleanupSchema> | { error: string };

async function mark(
  admin: SupabaseClient,
  job: JobName | StepJob,
  ok: boolean | null,
  error: string | null,
): Promise<void> {
  const { error: rpcError } = await admin.rpc("job_run_mark", {
    p_job: job,
    p_ok: ok,
    p_error: error,
  });
  if (rpcError) console.error("job_run_mark", rpcError.message);
}

export const markJobStart = (admin: SupabaseClient, job: JobName) =>
  mark(admin, job, null, null);

// Τέλος εκτέλεσης: χωρίς σφάλμα = πέτυχε· με σφάλμα (η ίδια η εκτέλεση απέτυχε) = τελευταίο σφάλμα της εργασίας.
// Ένα βήμα που επιστρέφει { error } δεν κάνει την εκτέλεση αποτυχημένη (Γεγονός 50 μόνο όταν το cron δεν τρέχει).
export const markJobEnd = (
  admin: SupabaseClient,
  job: JobName,
  error: string | null,
) => mark(admin, job, error === null, error);

// Τέλος ενός βήματος: χωρίς σφάλμα = πέτυχε, αλλιώς το σφάλμα του (η Υγεία το δείχνει κόκκινο μετά το όριο).
export const markStep = (
  admin: SupabaseClient,
  job: StepJob,
  error: string | null,
) => mark(admin, job, error === null, error);

// Τα αποτελέσματα των βημάτων ενός κύκλου (ό,τι επιστρέφουν οι βοηθοί τους): { error } ή περίληψη.
export interface StepOutcomes {
  billables: object;
  events: object;
  timed: object;
  cleanup: object;
}

const errorOf = (outcome: object): string | null =>
  "error" in outcome && typeof outcome.error === "string"
    ? outcome.error
    : null;

// Ο έλεγχος χρονισμών μετρά πόσα είδη Γεγονότων απέτυχαν· ένα που αποτυγχάνει κάθε φορά κοκκινίζει την εργασία.
const scanError = (outcome: object): string | null =>
  errorOf(outcome) ??
  ("failed" in outcome && typeof outcome.failed === "number" && outcome.failed > 0
    ? `Δεν έτρεξαν ${outcome.failed} έλεγχοι χρονισμών.`
    : null);

// Κάθε βήμα γράφει πότε έτρεξε. Ο καθαρισμός μόνο όταν έτρεξε πράγματι (μία φορά τη μέρα· αλλιώς «skipped»).
export async function markSteps(
  admin: SupabaseClient,
  outcomes: StepOutcomes,
): Promise<void> {
  await markStep(admin, "billables", errorOf(outcomes.billables));
  await markStep(admin, "events_process", errorOf(outcomes.events));
  await markStep(admin, "automations_scan", scanError(outcomes.timed));
  if (!("skipped" in outcomes.cleanup))
    await markStep(admin, "sends_cleanup", errorOf(outcomes.cleanup));
}

export async function checkHealth(
  admin: SupabaseClient,
  job: JobName,
): Promise<HealthOutcome> {
  const { data, error } = await admin.rpc("health_check", { p_job: job });
  if (error) {
    console.error("health_check", error.message);
    return { error: "Ο έλεγχος Υγείας δεν έτρεξε." };
  }
  const parsed = healthSchema.safeParse(data);
  return parsed.success ? parsed.data : { jobs: 0, google: 0, events: 0 };
}

export async function cleanSends(
  admin: SupabaseClient,
): Promise<CleanupOutcome> {
  const { data, error } = await admin.rpc("sends_cleanup");
  if (error) {
    console.error("sends_cleanup", error.message);
    return { error: "Το Ιστορικό αποστολών δεν καθαρίστηκε." };
  }
  const parsed = cleanupSchema.safeParse(data);
  return parsed.success ? parsed.data : { skipped: true };
}
