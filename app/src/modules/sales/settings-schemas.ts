import { z } from "zod";

import { parseRoutingValue } from "./helpers";
import type { ListName } from "./types";

// Έλεγχος των φορμών Ρυθμίσεων › Πωλήσεις στο όριο του server. Τα μηνύματα είναι αυτά που βλέπει ο χρήστης.

// Ο πίνακας κάθε λίστας: μία πηγή, ώστε ούτε το action ούτε η οθόνη να γράφουν ονόματα πινάκων.
export const LIST_TABLES: Readonly<Record<ListName, string>> = {
  stages: "sales_stages",
  sources: "sales_sources",
  loss_reasons: "sales_loss_reasons",
  activity_kinds: "sales_activity_kinds",
};

const listNameSchema = z.enum(
  Object.keys(LIST_TABLES) as [ListName, ...ListName[]],
  "Άγνωστη λίστα.",
);
const itemId = z.uuid("Η τιμή δεν βρέθηκε.");
const label = z.string().trim().min(1, "Γράψε την ετικέτα.");

export const createListItemSchema = z.object({ list: listNameSchema, label });
export const renameListItemSchema = z.object({
  list: listNameSchema,
  id: itemId,
  label,
});
export const moveListItemSchema = z.object({
  list: listNameSchema,
  id: itemId,
  direction: z.enum(["up", "down"], "Άγνωστη κατεύθυνση."),
});
// Απόσυρση, επανενεργοποίηση και διαγραφή δείχνουν μια τιμή και τίποτα άλλο.
export const listItemRefSchema = z.object({ list: listNameSchema, id: itemId });
export const retireStageSchema = z.object({
  stageId: z.uuid("Το Στάδιο δεν βρέθηκε."),
  moveToId: z.union([z.literal(""), z.uuid("Διάλεξε Στάδιο για τη μεταφορά.")]),
});
export const routingSchema = z.object({
  value: z.string().refine((v) => parseRoutingValue(v) !== null, {
    message: "Διάλεξε πού πάνε οι νέες Ευκαιρίες.",
  }),
});
