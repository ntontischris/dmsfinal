import { z } from "zod";

import type { GoogleDeletion, GoogleView } from "./types";

// Τα JSON των RPC του Google, όπως έρχονται από τη βάση. Ό,τι δεν ταιριάζει δεν φτάνει στην οθόνη.

const rulesSchema = z.object({
  newEvent: z.enum(["blocked", "none"]),
  deleteHours: z.union([z.literal(12), z.literal(24), z.literal(48)]),
  writePending: z.boolean(),
});

const activitySchema = z.object({
  at: z.string(),
  kind: z.string(),
  message: z.string(),
  filmingId: z.string().nullable(),
});

export const googleViewSchema: z.ZodType<GoogleView> = z.object({
  connected: z.boolean(),
  sharedWith: z.string().nullable(),
  lastSyncAt: z.string().nullable(),
  lastError: z.string().nullable(),
  lastErrorAt: z.string().nullable(),
  pendingWrites: z.number(),
  oldestPendingAt: z.string().nullable(),
  pendingDeletions: z.number(),
  rules: rulesSchema,
  activity: z.array(activitySchema),
});

export const googleDeletionsSchema: z.ZodType<GoogleDeletion[]> = z.array(
  z.object({
    filmingId: z.string(),
    title: z.string().nullable(),
    startsAt: z.string(),
    state: z.string(),
    detectedAt: z.string(),
    deadlineAt: z.string(),
  }),
);
