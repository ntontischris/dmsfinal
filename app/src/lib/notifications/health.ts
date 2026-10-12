import type { SupabaseClient } from "@supabase/supabase-js";
import { z } from "zod";

// Υγεία (#174, Α14): κάθε cron γράφει πότε ξεκίνησε και αν πέτυχε (job_runs) και ελέγχει το άλλο cron, το Google και τα
// κολλημένα Γεγονότα (Γεγονότα 50–53). Το cron της ουράς σβήνει και ό,τι πέρασε τους 12 μήνες στο Ιστορικό αποστολών.
// Κανένα σφάλμα εδώ δεν σταματά τη δουλειά του cron: καταγράφεται μόνο το μήνυμα της βάσης.

export type JobName = "outbox" | "google";

const healthSchema = z.object({
  jobs: z.number(),
  google: z.number(),
  events: z.number(),
});
const cleanupSchema = z.object({
  sends: z.number(),
  logs: z.number(),
  outbox: z.number(),
});

export type HealthOutcome = z.infer<typeof healthSchema> | { error: string };
export type CleanupOutcome = z.infer<typeof cleanupSchema> | { error: string };

// Το πρώτο σφάλμα από τα βήματα ενός cron, για το job_runs (null = όλα πέτυχαν).
const stepError = (value: unknown): string | null =>
  typeof value === "object" &&
  value !== null &&
  "error" in value &&
  typeof value.error === "string"
    ? value.error
    : null;

export const firstStepError = (
  steps: Readonly<Record<string, unknown>>,
): string | null => {
  for (const [name, value] of Object.entries(steps)) {
    const error = stepError(value);
    if (error !== null) return `${name}: ${error}`;
  }
  return null;
};

async function mark(
  admin: SupabaseClient,
  job: JobName,
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

// Τέλος εκτέλεσης: χωρίς σφάλμα = πέτυχε· με σφάλμα = γράφεται ως τελευταίο σφάλμα της εργασίας.
export const markJobEnd = (
  admin: SupabaseClient,
  job: JobName,
  error: string | null,
) => mark(admin, job, error === null, error);

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
  return parsed.success ? parsed.data : { sends: 0, logs: 0, outbox: 0 };
}
