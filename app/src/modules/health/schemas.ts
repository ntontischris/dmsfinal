import { z } from "zod";

// Το JSON της health_view (#215): πέντε ενότητες και το «θέλουν προσοχή». Χωρίς θέμα, σώμα ή link αποστολής.

export const JOB_STATES = ["ok", "late", "never"] as const;

const jobSchema = z.object({
  job: z.string().min(1),
  label: z.string(),
  schedule: z.string(),
  lastOkAt: z.string().nullable(),
  lastErrorAt: z.string().nullable(),
  lastError: z.string().nullable(),
  state: z.enum(JOB_STATES),
});

const failedSendSchema = z.object({
  id: z.string().min(1),
  what: z.string(),
  at: z.string(),
  recipient: z.string().nullable(),
  email: z.string().nullable(),
  reason: z.string().nullable(),
  retryRef: z.uuid().nullable(),
});

const stuckEventSchema = z.object({
  id: z.number().int(),
  what: z.string(),
  at: z.string(),
  attempts: z.number().int(),
  reason: z.string().nullable(),
});

export const healthViewSchema = z.object({
  now: z.string(),
  attention: z.number().int().nonnegative(),
  jobs: z.array(jobSchema),
  sends: z.object({
    items: z.array(failedSendSchema),
    total: z.number().int().nonnegative(),
  }),
  google: z.object({
    connected: z.boolean(),
    lastSyncAt: z.string().nullable(),
    errorSince: z.string().nullable(),
    lastError: z.string().nullable(),
    stopped: z.boolean(),
    pendingWrites: z.number().int().nonnegative(),
  }),
  events: z.object({
    stuck: z.array(stuckEventSchema),
    stuckTotal: z.number().int().nonnegative(),
    waiting: z.number().int().nonnegative(),
  }),
  ai: z.object({
    month: z.string(),
    spentMicros: z.number(),
    capMicros: z.number(),
    publicShare: z.number(),
    alert: z.boolean(),
  }),
});

export type JobState = (typeof JOB_STATES)[number];
export type HealthJob = z.infer<typeof jobSchema>;
export type FailedSend = z.infer<typeof failedSendSchema>;
export type StuckEvent = z.infer<typeof stuckEventSchema>;
export type HealthView = z.infer<typeof healthViewSchema>;

// Οι αναφορές των ενεργειών: γραμμή της ουράς (uuid) ή του email_log ('l' + uuid), Γεγονός (αριθμός).
const UUID = "[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}";
export const resendSchema = z.object({ ref: z.uuid() });
export const ignoreSchema = z.object({
  ref: z.string().regex(new RegExp(`^l?${UUID}$`, "i")),
});
export const retryEventSchema = z.object({
  id: z.coerce.number().int().positive(),
});
