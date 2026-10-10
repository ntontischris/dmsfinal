import { z } from "zod";

import {
  CREW_RESPONSES,
  FILMING_STATES,
  type FilmingCard,
  type FilmingHistoryEntry,
  type FilmingRow,
} from "./types";

// Σχήμα των JSON της βάσης για τις λίστες και τη σελίδα Γυρίσματος (filmings_view, filming_view).
// Τα κλειδιά έρχονται camelCase· ό,τι δεν ταιριάζει σπάει εδώ, δυνατά, και δεν φτάνει στην οθόνη.

const state = z.enum(FILMING_STATES);
const named = z.object({ id: z.string(), name: z.string() });

export const pendingRescheduleSchema = z.object({
  startsAt: z.string(),
  hours: z.number(),
  requestedAt: z.string(),
});

export const signalsSchema = z.object({
  equipmentConflict: z.boolean(),
  isExtra: z.boolean(),
  cancelRequest: z.boolean(),
  crewDeclined: z.boolean(),
  slotProblem: z.string().nullable(),
  pendingReschedule: pendingRescheduleSchema.nullable(),
});

export const rowSchema: z.ZodType<FilmingRow> = z.object({
  id: z.string(),
  startsAt: z.string(),
  hours: z.number(),
  state,
  client: named.nullable(),
  production: z.object({ id: z.string(), title: z.string() }),
  crew: z.object({ confirmed: z.number(), total: z.number() }).nullable(),
  signals: signalsSchema,
});

export const filmingsViewSchema = z.array(rowSchema);

const kindSchema = z.object({
  id: z.string(),
  label: z.string(),
  measure: z.enum(["per_filming", "per_hour", "per_day"]),
});

export const provisionSchema = z.object({
  given: z.number(),
  carried: z.number(),
  used: z.number(),
  reserved: z.number(),
  balance: z.number(),
  kind: kindSchema,
});

const crewSchema = z.object({
  userId: z.string(),
  name: z.string(),
  response: z.enum(CREW_RESPONSES),
  reason: z.string().nullable(),
  respondedAt: z.string().nullable(),
  isBlocked: z.boolean(),
});

const historySchema = z.object({
  at: z.string(),
  action: z.enum(["insert", "update", "delete", "event"]),
  event: z.string().nullable(),
  actor_name: z.string().nullable(),
  before: z.record(z.string(), z.unknown()).nullable(),
  after: z.record(z.string(), z.unknown()).nullable(),
});

const periodSchema = z
  .object({
    n: z.number(),
    starts: z.string(),
    ends: z.string(),
    state: z.enum(["closed", "current", "next"]),
  })
  .nullable();

// Η κάρτα του Γυρίσματος (E3). Τα πεδία του Ιστορικού έρχονται snake_case από το Ίχνος.
const cardShape = z.object({
  id: z.string(),
  startsAt: z.string(),
  hours: z.number(),
  actualHours: z.number().nullable(),
  location: z.string().nullable(),
  origin: z.enum(["client", "team", "blocked_time"]),
  state,
  isExtra: z.boolean(),
  burned: z.boolean(),
  kind: kindSchema.nullable(),
  client: named.nullable(),
  production: z.object({
    id: z.string(),
    title: z.string(),
    isInternal: z.boolean(),
  }),
  agreement: z
    .object({
      id: z.string(),
      title: z.string(),
      kind: z.string(),
      filmingCancelHours: z.number(),
    })
    .nullable(),
  period: periodSchema,
  clientNote: z.string().nullable(),
  internalNote: z.string().nullable(),
  approvedAt: z.string().nullable(),
  rejectedAt: z.string().nullable(),
  rejectedReason: z.string().nullable(),
  cancelledAt: z.string().nullable(),
  cancelledSide: z.enum(["team", "client"]).nullable(),
  cancelledReason: z.string().nullable(),
  cancelRequest: z.object({ at: z.string(), reason: z.string() }).nullable(),
  doneAt: z.string().nullable(),
  noShowAt: z.string().nullable(),
  provision: provisionSchema.nullable(),
  crew: z.array(crewSchema),
  equipment: z.array(
    z.object({
      itemId: z.string(),
      name: z.string(),
      status: z.string(),
      conflict: z.boolean(),
    }),
  ),
  history: z.array(historySchema),
  signals: signalsSchema,
  viewerCan: z.object({
    approve: z.boolean(),
    reject: z.boolean(),
    cancel: z.boolean(),
    reschedule: z.boolean(),
    markDone: z.boolean(),
    markNoShow: z.boolean(),
    undo: z.boolean(),
    crew: z.boolean(),
    equipment: z.boolean(),
    decideCancel: z.boolean(),
    clientCancel: z.boolean(),
    requestCancel: z.boolean(),
    decideReschedule: z.boolean(),
    clientReschedule: z.boolean(),
    clientWithdrawReschedule: z.boolean(),
  }),
});

const toHistoryEntry = (entry: z.infer<typeof historySchema>): FilmingHistoryEntry => ({
  at: entry.at,
  action: entry.action,
  event: entry.event,
  actorName: entry.actor_name,
  before: entry.before,
  after: entry.after,
});

export const cardSchema = cardShape.transform(
  (row): FilmingCard => ({ ...row, history: row.history.map(toHistoryEntry) }),
);
