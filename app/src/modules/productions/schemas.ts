import { z } from "zod";

import { PRODUCTION_TABS } from "./types";

// Έλεγχος των φορμών και των φίλτρων του module στο όριο του server. Τα μηνύματα είναι αυτά που βλέπει ο χρήστης.
// Η βάση ελέγχει ξανά· εδώ φαίνονται τα λάθη πριν φύγει το αίτημα.

const text = z.string().trim();
const TITLE_MESSAGE = "Γράψε τίτλο για την Παραγωγή.";
const NOTE_LIMIT = 500;

const title = text
  .min(1, TITLE_MESSAGE)
  .max(300, "Ο τίτλος είναι μέχρι 300 χαρακτήρες.");
const note = text.max(NOTE_LIMIT, "Το σχόλιο είναι μέχρι 500 χαρακτήρες.");

// «Χωρίς υπεύθυνο» έρχεται ως κενή τιμή και γίνεται null.
const optionalUuid = z
  .union([z.literal(""), z.uuid()])
  .transform((value) => (value === "" ? null : value));

// Το φίλτρο της λίστας στη διεύθυνση: καρτέλα (άγνωστη = Ανοιχτές) και «Εσωτερικές».
export const listFilterSchema = z.object({
  tab: z.enum(PRODUCTION_TABS).catch("open"),
  internal: z
    .string()
    .optional()
    .transform((value) => value === "1"),
});

export const createInternalSchema = z.object({
  title,
  ownerId: optionalUuid,
});

export const productionRefSchema = z.object({ productionId: z.uuid() });

export const deliverSchema = z.object({
  productionId: z.uuid(),
  note: note.min(1, "Η παράδοση θέλει σχόλιο: τι παραδόθηκε και πού."),
});

export const reopenSchema = z.object({
  productionId: z.uuid(),
  reason: note.min(1, "Η επανάνοιξη θέλει λόγο."),
});

export const cancelSchema = z.object({
  productionId: z.uuid(),
  reason: note.min(1, "Η ακύρωση θέλει λόγο."),
});

export const transferSchema = z.object({
  productionId: z.uuid(),
  ownerId: z.uuid("Διάλεξε Υπεύθυνο."),
});

export const memberSchema = z.object({
  productionId: z.uuid(),
  userId: z.uuid("Διάλεξε Μέλος."),
});

