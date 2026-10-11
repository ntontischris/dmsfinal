import { z } from "zod";

import {
  CANCEL_OUTCOMES,
  CHARGES,
  DELIVERABLE_STATES,
  REQUEST_DECISIONS,
  VERSION_STATES,
} from "./types";

// Σχήμα των JSON που επιστρέφουν τα RPC της βάσης (deliverables_queue_view, deliverable_view, ...).
// Ό,τι δεν ταιριάζει σπάει εδώ, δυνατά, και δεν φτάνει στην οθόνη.

const state = z.enum(DELIVERABLE_STATES);
const charge = z.enum(CHARGES);
const cancelOutcome = z.enum(CANCEL_OUTCOMES);
const versionState = z.enum(VERSION_STATES);

export const deliverableCardSchema = z.object({
  id: z.string(),
  title: z.string(),
  productionId: z.string(),
  production: z.string(),
  client: z.string().nullable(),
  kind: z.string(),
  kindId: z.string(),
  assigneeId: z.string().nullable(),
  assigneeName: z.string().nullable(),
  filmingId: z.string().nullable(),
  deadline: z.string().nullable(),
  isLate: z.boolean(),
  state,
  daysWaiting: z.number(),
  overLimit: z.boolean(),
  linkBroken: z.boolean(),
  versionCount: z.number(),
  roundsUsed: z.number(),
  roundsLimit: z.number().nullable(),
  charge,
  chargeReason: z.string().nullable(),
  approvedAt: z.string().nullable(),
  cancelledAt: z.string().nullable(),
  cancelReason: z.string().nullable(),
  cancelOutcome: cancelOutcome.nullable(),
});

// Σχήμα των κοινών λιστών (ουρά, εκκρεμείς χρεώσεις, Παραδοτέα της G2).
export const deliverableCardsSchema = z.array(deliverableCardSchema);

const commentSchema = z.object({
  id: z.string(),
  body: z.string(),
  atSeconds: z.number().nullable(),
  isInternal: z.boolean(),
  createdAt: z.string(),
  authorName: z.string().nullable(),
});

const versionSchema = z.object({
  number: z.number(),
  url: z.url().refine((value) => value.startsWith("https://"), "Το link θέλει https."),
  host: z.string(),
  state: versionState,
  note: z.string().nullable(),
  reviewNote: z.string().nullable(),
  createdAt: z.string(),
  sentAt: z.string().nullable(),
  answeredAt: z.string().nullable(),
  answerNote: z.string().nullable(),
  linkBroken: z.boolean(),
  comments: z.array(commentSchema),
});

const canSchema = z.object({
  addVersion: z.boolean(),
  send: z.boolean(),
  return: z.boolean(),
  approveInternal: z.boolean(),
  cancel: z.boolean(),
  comment: z.boolean(),
  decideCharge: z.boolean(),
  edit: z.boolean(),
});

const historySchema = z.object({
  at: z.string(),
  action: z.enum(["insert", "update", "delete", "event"]),
  entity: z.string(),
  actor_name: z.string().nullable(),
  before: z.record(z.string(), z.unknown()).nullable(),
  after: z.record(z.string(), z.unknown()).nullable(),
});

// Η σελίδα του Παραδοτέου (H2): η κάρτα, οι Εκδόσεις, τα δικαιώματα, η χρέωση και το Ίχνος (snake_case, εδώ camelCase).
const requestSchema = z.object({
  id: z.string(),
  body: z.string(),
  createdAt: z.string(),
  createdByName: z.string().nullable(),
  decision: z.enum(REQUEST_DECISIONS).nullable(),
  decidedAt: z.string().nullable(),
  decidedByName: z.string().nullable(),
  decisionNote: z.string().nullable(),
  newDeliverableId: z.string().nullable(),
});

export const deliverableDetailSchema = deliverableCardSchema
  .extend({
    versions: z.array(versionSchema),
    can: canSchema,
    pendingCharge: z.boolean(),
    history: z.array(historySchema),
    requests: z.array(requestSchema),
    finalFilesUrl: z.string().nullable(),
  })
  .transform((row) => ({
    ...row,
    history: row.history.map((entry) => ({
      at: entry.at,
      action: entry.action,
      entity: entry.entity,
      actorName: entry.actor_name,
      before: entry.before,
      after: entry.after,
    })),
  }));

// Υποψήφια για νέο Παραδοτέο: είδη πλήθους με υπόλοιπο, ενεργοί Χρήστες, Γυρίσματα της Παραγωγής.
export const deliverableCandidatesSchema = z.object({
  kinds: z.array(
    z.object({
      id: z.string(),
      label: z.string(),
      unit: z.string(),
      balance: z.number().nullable(),
    }),
  ),
  assignees: z.array(z.object({ id: z.string(), name: z.string() })),
  filmings: z.array(
    z.object({ id: z.string(), startsAt: z.string(), state: z.string() }),
  ),
});
