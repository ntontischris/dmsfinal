import { z } from "zod";

import { deliverableCardsSchema } from "@/modules/deliverables";

import {
  BILLABLE_REASONS,
  PERIOD_STATES,
  PRODUCTION_STATES,
  TASK_PRIORITIES,
  TASK_STATUSES,
  type MyTask,
  type PeriodBalance,
  type ProductionCard,
  type ProductionDetail,
  type ProductionHistoryEntry,
} from "./types";

// Σχήμα των JSON που επιστρέφουν τα RPC ανάγνωσης της βάσης (productions_view, production_view).
// Τα κλειδιά της κάρτας έρχονται ήδη camelCase· τα υπόλοιπα (balances, history) snake_case, και μετατρέπονται εδώ.
// Ό,τι δεν ταιριάζει σπάει εδώ, δυνατά, και δεν φτάνει στην οθόνη.

const state = z.enum(PRODUCTION_STATES);
const periodState = z.enum(PERIOD_STATES);

const cardSchema = z.object({
  id: z.string(),
  title: z.string(),
  client: z.object({ id: z.string(), name: z.string() }).nullable(),
  period: z
    .object({
      n: z.number(),
      starts: z.string(),
      ends: z.string(),
      state: periodState,
    })
    .nullable(),
  owner: z.object({ id: z.string().optional(), name: z.string() }).nullable(),
  state,
  isInternal: z.boolean(),
  stage: z.object({ id: z.string(), label: z.string() }).nullable().default(null),
});

type CardRow = z.infer<typeof cardSchema>;

const toCard = (row: CardRow): ProductionCard => ({
  id: row.id,
  title: row.title,
  client: row.client,
  period: row.period,
  owner: row.owner ? { id: row.owner.id ?? null, name: row.owner.name } : null,
  state: row.state,
  isInternal: row.isInternal,
  stage: row.stage,
});

export const productionsViewSchema = z
  .array(cardSchema)
  .transform((rows): ProductionCard[] => rows.map(toCard));

const balanceSchema = z.object({
  kind_id: z.string(),
  code: z.string().nullable(),
  label: z.string(),
  unit: z.string(),
  given: z.number(),
  carried: z.number(),
  used: z.number(),
  reserved: z.number(),
  balance: z.number(),
});

const historySchema = z.object({
  at: z.string(),
  action: z.enum(["insert", "update", "delete", "event"]),
  event: z.string().nullable(),
  actor_name: z.string().nullable(),
  before: z.record(z.string(), z.unknown()).nullable(),
  after: z.record(z.string(), z.unknown()).nullable(),
});

// Οι Εργασίες της Παραγωγής (G2): μόνο για την ομάδα (ο πελάτης παίρνει λίστα κενή).
const taskSchema = z.object({
  id: z.string(),
  title: z.string(),
  assigneeId: z.string().nullable(),
  assigneeName: z.string().nullable(),
  dueDate: z.string().nullable(),
  isLate: z.boolean(),
  done: z.boolean(),
  status: z.enum(TASK_STATUSES),
  priority: z.enum(TASK_PRIORITIES),
});

// Τα Γυρίσματα της Παραγωγής (G2): μόνο όσα βλέπει ο Χρήστης, από τη βάση.
const filmingSchema = z.object({
  id: z.string(),
  startsAt: z.string(),
  hours: z.number(),
  state: z.string(),
  isExtra: z.boolean(),
  kind: z.string().nullable(),
});

const toBalance = (row: z.infer<typeof balanceSchema>): PeriodBalance => ({
  kindId: row.kind_id,
  code: row.code,
  label: row.label,
  unit: row.unit,
  given: row.given,
  carried: row.carried,
  used: row.used,
  reserved: row.reserved,
  balance: row.balance,
});

const toHistory = (
  row: z.infer<typeof historySchema>,
): ProductionHistoryEntry => ({
  at: row.at,
  action: row.action,
  event: row.event,
  actorName: row.actor_name,
  before: row.before,
  after: row.after,
});

// Η σελίδα Παραγωγής: η κάρτα, και πάνω της η Συμφωνία, τα υπόλοιπα, τα Μέλη, τα δικαιώματα του θεατή και το Ιστορικό.
export const productionDetailSchema = cardSchema
  .extend({
    agreement: z
      .object({ id: z.string(), title: z.string(), kind: z.string() })
      .nullable(),
    balances: z.array(balanceSchema),
    deliveredAt: z.string().nullable(),
    deliveredNote: z.string().nullable(),
    cancelledAt: z.string().nullable(),
    cancelledReason: z.string().nullable(),
    members: z.array(z.object({ userId: z.string(), name: z.string() })),
    history: z.array(historySchema),
    filmings: z.array(filmingSchema),
    deliverables: deliverableCardsSchema,
    tasks: z.array(taskSchema),
    autoDelivered: z.boolean(),
    viewerCan: z.object({
      deliver: z.boolean(),
      reopen: z.boolean(),
      cancel: z.boolean(),
      transfer: z.boolean(),
      members: z.boolean(),
    }),
  })
  .transform((row): ProductionDetail => ({
    ...toCard(row),
    agreement: row.agreement,
    balances: row.balances.map(toBalance),
    deliveredAt: row.deliveredAt,
    deliveredNote: row.deliveredNote,
    cancelledAt: row.cancelledAt,
    cancelledReason: row.cancelledReason,
    members: row.members,
    history: row.history.map(toHistory),
    viewerCan: row.viewerCan,
    filmings: row.filmings,
    deliverables: row.deliverables,
    tasks: row.tasks,
    autoDelivered: row.autoDelivered,
  }));

// Υποψήφιοι Υπεύθυνοι: id και όνομα των ενεργών Χρηστών με Δικαίωμα Παραγωγών.
export const ownerCandidatesViewSchema = z.array(
  z.object({ id: z.string(), name: z.string() }),
);

// «Οι εργασίες μου» (G4): οι Εργασίες του θεατή, με τη σειρά της βάσης.
export const myTasksViewSchema = z.array(
  z.object({
    id: z.string(),
    title: z.string(),
    dueDate: z.string().nullable(),
    status: z.enum(TASK_STATUSES),
    priority: z.enum(TASK_PRIORITIES),
    isLate: z.boolean(),
    production: z.object({ id: z.string(), title: z.string(), canOpen: z.boolean() }),
    clientName: z.string().nullable(),
  }),
) satisfies z.ZodType<MyTask[]>;

// Τα Στάδια του πίνακα και αν ο θεατής τα επεξεργάζεται.
export const stagesViewSchema = z.object({
  stages: z.array(z.object({ id: z.string(), label: z.string(), isActive: z.boolean() })),
  canEdit: z.boolean(),
});

// Φόρτος ανά άτομο.
export const workloadViewSchema = z.array(
  z.object({
    userId: z.string(),
    name: z.string(),
    productions: z.number(),
    tasks: z.number(),
    lateTasks: z.number(),
    deliverables: z.number(),
    filmings: z.number(),
  }),
);

// Τιμή και Τιμολογητέα της Παραγωγής.
export const productionMoneySchema = z.object({
  price: z.number().nullable(),
  priceOf: z.enum(["period", "agreement"]).nullable(),
  billables: z.array(
    z.object({
      id: z.string(),
      label: z.string(),
      reason: z.enum(BILLABLE_REASONS),
      net: z.number(),
      billableOn: z.string(),
      covered: z.number(),
    }),
  ),
});
