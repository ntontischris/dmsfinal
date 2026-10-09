import { z } from "zod";

import {
  EQUIPMENT_STATUSES,
  type EquipmentCategory,
  type EquipmentItemDetail,
  type EquipmentItemRow,
  type EquipmentTemplate,
  type HistoryEntry,
} from "./types";

// Σχήμα των JSON που επιστρέφουν τα RPC ανάγνωσης της βάσης (equipment_*_view). Ό,τι δεν ταιριάζει
// σπάει εδώ, δυνατά, και δεν φτάνει στην οθόνη.

const status = z.enum(EQUIPMENT_STATUSES);
const count = z.coerce.number(); // ο αριθμός έρχεται ως αριθμός· coerce για να μη μείνει ως κείμενο

const itemRowFields = z.object({
  id: z.string(),
  name: z.string(),
  code: z.string().nullable(),
  note: z.string().nullable(),
  status,
  status_note: z.string().nullable(),
  category_id: z.string(),
  category_name: z.string(),
  category_retired: z.boolean(),
  updated_at: z.string(),
});

const toItemRow = (row: z.infer<typeof itemRowFields>): EquipmentItemRow => ({
  id: row.id,
  name: row.name,
  code: row.code,
  note: row.note,
  status: row.status,
  statusNote: row.status_note,
  categoryId: row.category_id,
  categoryName: row.category_name,
  categoryRetired: row.category_retired,
  updatedAt: row.updated_at,
});

export const itemsViewSchema = z.array(itemRowFields).transform((rows) => rows.map(toItemRow));

const categoryRow = z.object({
  id: z.string(),
  name: z.string(),
  sort_order: count,
  is_retired: z.boolean(),
  item_count: count,
  updated_at: z.string(),
});

export const categoriesViewSchema = z.array(categoryRow).transform(
  (rows): EquipmentCategory[] =>
    rows.map((row) => ({
      id: row.id,
      name: row.name,
      sortOrder: row.sort_order,
      isRetired: row.is_retired,
      itemCount: row.item_count,
      updatedAt: row.updated_at,
    })),
);

const templateRow = z.object({
  id: z.string(),
  name: z.string(),
  note: z.string().nullable(),
  items: z.array(z.object({ id: z.string(), name: z.string(), status })).nullable(),
  updated_at: z.string(),
});

export const templatesViewSchema = z.array(templateRow).transform(
  (rows): EquipmentTemplate[] =>
    rows.map((row) => ({
      id: row.id,
      name: row.name,
      note: row.note,
      items: row.items ?? [],
      updatedAt: row.updated_at,
    })),
);

const historyRow = z.object({
  at: z.string(),
  action: z.enum(["insert", "update", "delete", "event"]),
  event: z.string().nullable(),
  actor_name: z.string().nullable(),
  before: z.record(z.string(), z.unknown()).nullable(),
  after: z.record(z.string(), z.unknown()).nullable(),
});

const toHistory = (row: z.infer<typeof historyRow>): HistoryEntry => ({
  at: row.at,
  action: row.action,
  event: row.event,
  actorName: row.actor_name,
  before: row.before,
  after: row.after,
});

// Η σελίδα αντικειμένου: ένα JSON αντικείμενο, με τα Πρότυπα και το Ίχνος του.
const reservationSchema = z.object({
  filmingId: z.string().nullable(),
  startsAt: z.string(),
  hours: z.number(),
  state: z.enum(["pending", "scheduled", "done", "no_show", "cancelled", "rejected"]),
  conflict: z.boolean(),
});

export const itemDetailSchema = itemRowFields
  .extend({
    updated_by_name: z.string().nullable(),
    templates: z.array(z.object({ id: z.string(), name: z.string() })),
    history: z.array(historyRow),
    nextReservation: reservationSchema.nullable(),
    reservations: z.array(reservationSchema),
  })
  .transform(
    (row): EquipmentItemDetail => ({
      ...toItemRow(row),
      updatedByName: row.updated_by_name,
      templates: row.templates,
      history: row.history.map(toHistory),
      nextReservation: row.nextReservation,
      reservations: row.reservations,
    }),
  );
