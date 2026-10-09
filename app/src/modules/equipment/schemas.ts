import { z } from "zod";

import { EQUIPMENT_STATUSES } from "./types";

// Έλεγχος των φορμών του Εξοπλισμού στο όριο του server. Τα μηνύματα είναι αυτά που βλέπει ο χρήστης.
// Η βάση ελέγχει ξανά· εδώ φαίνονται τα λάθη πριν φύγει το αίτημα.

const text = z.string().trim();
const NAME_MESSAGE = "Γράψε όνομα.";
const CATEGORY_MESSAGE = "Διάλεξε Κατηγορία.";
const REPAIR_NOTE_MESSAGE = "Η επισκευή θέλει λόγο: τι έπαθε και πότε επιστρέφει.";
const TEMPLATE_ITEMS_MESSAGE = "Διάλεξε τουλάχιστον ένα αντικείμενο.";

const categoryName = text
  .min(1, NAME_MESSAGE)
  .max(80, "Το όνομα της Κατηγορίας είναι μέχρι 80 χαρακτήρες.");
const itemName = text
  .min(1, NAME_MESSAGE)
  .max(120, "Το όνομα είναι μέχρι 120 χαρακτήρες.");
const code = text.max(60, "Ο κωδικός είναι μέχρι 60 χαρακτήρες.");
const note = text.max(500, "Η σημείωση είναι μέχρι 500 χαρακτήρες.");

export const categoryNameSchema = z.object({ name: categoryName });
export const renameCategorySchema = z.object({
  categoryId: z.uuid(),
  name: categoryName,
});
export const categoryRefSchema = z.object({ categoryId: z.uuid() });

const itemFields = {
  categoryId: z.uuid(CATEGORY_MESSAGE),
  name: itemName,
  code,
  note,
};

// Η Ποσότητα είναι τρόπος εγγραφής: N μονάδες με αρίθμηση. Η φόρμα στέλνει κείμενο· κενό = 1.
const QUANTITY_MESSAGE = "Η Ποσότητα είναι από 1 ως 50.";
export const quantitySchema = z.preprocess(
  (value) => (value === "" || value === undefined ? 1 : value),
  z
    .coerce.number({ error: QUANTITY_MESSAGE })
    .int(QUANTITY_MESSAGE)
    .min(1, QUANTITY_MESSAGE)
    .max(50, QUANTITY_MESSAGE),
);

export const createItemSchema = z.object({
  ...itemFields,
  quantity: quantitySchema,
});
export const updateItemSchema = z.object({ ...itemFields, itemId: z.uuid() });
export const itemRefSchema = z.object({ itemId: z.uuid() });

export const setStatusSchema = z
  .object({
    itemId: z.uuid(),
    status: z.enum(EQUIPMENT_STATUSES),
    note,
  })
  .refine((value) => value.status !== "in_repair" || value.note !== "", {
    message: REPAIR_NOTE_MESSAGE,
    path: ["note"],
  });

const templateFields = {
  name: text
    .min(1, "Γράψε όνομα για το Πρότυπο.")
    .max(120, "Το όνομα είναι μέχρι 120 χαρακτήρες."),
  note,
  itemIds: z.array(z.uuid()).min(1, TEMPLATE_ITEMS_MESSAGE),
};

export const createTemplateSchema = z.object(templateFields);
export const updateTemplateSchema = z.object({
  ...templateFields,
  templateId: z.uuid(),
});
export const templateRefSchema = z.object({ templateId: z.uuid() });

// Τα checkbox του Προτύπου έρχονται ως πολλαπλές τιμές του ίδιου πεδίου.
export const formItemIds = (form: FormData): string[] =>
  form.getAll("itemIds").map(String);
