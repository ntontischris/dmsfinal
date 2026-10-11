import { z } from "zod";

import { ATTACHMENT_MAX_FILES, ERROR_TOO_MANY } from "./attachment-rules";

// Φόρμες των Μηνυμάτων. Τα όρια ταυτίζονται με της βάσης (1..4.000 χαρακτήρες, σύνδεσμοι μόνο https).

export const MESSAGE_MAX_LENGTH = 4000;

// Ίδιος κανόνας με το authz.message_clean_body: τα http://, ftp:// και file:// απορρίπτονται.
const UNSAFE_LINK = /(^|[^a-z0-9])(http|ftp|file):\/\//i;

const bodyTextSchema = z
  .string()
  .trim()
  .max(MESSAGE_MAX_LENGTH, "Το Μήνυμα έχει το πολύ 4.000 χαρακτήρες.")
  .refine((value) => !UNSAFE_LINK.test(value), "Επιτρέπονται μόνο σύνδεσμοι που ξεκινούν με https://");

export const bodySchema = bodyTextSchema.min(1, "Γράψε το Μήνυμα.");

const idSchema = z.uuid("Άκυρο στοιχείο.");
const optionalIdSchema = z.union([z.literal("").transform(() => null), idSchema]);

// Η διαδρομή που έδωσε η βάση: <πελάτης>/<uuid>.<επέκταση>.
const ATTACHMENT_PATH = /^[0-9a-f-]{36}\/[0-9a-f-]{36}\.[a-z]{3,4}$/;
export const attachmentPathSchema = z.string().regex(ATTACHMENT_PATH, "Το αρχείο δεν ανέβηκε σωστά.");

// Με συνημμένα το κείμενο μπορεί να λείπει· χωρίς συνημμένα είναι υποχρεωτικό.
export const sendSchema = z
  .object({
    clientId: idSchema,
    productionId: optionalIdSchema,
    body: bodyTextSchema,
    internal: z.boolean(),
    mentions: z.array(idSchema),
    attachments: z.array(attachmentPathSchema).max(ATTACHMENT_MAX_FILES, ERROR_TOO_MANY),
  })
  .refine((value) => value.internal || value.mentions.length === 0, {
    message: "Οι αναφορές επιτρέπονται μόνο σε Εσωτερικά Μηνύματα.",
  })
  .refine((value) => value.body.length > 0 || value.attachments.length > 0, {
    message: "Γράψε το Μήνυμα.",
    path: ["body"],
  });

// Αίτημα για θέσεις ανεβάσματος: τα στοιχεία των αρχείων που διάλεξε ο χρήστης (όχι τα ίδια τα αρχεία).
export const uploadRequestSchema = z.object({
  clientId: idSchema,
  productionId: optionalIdSchema,
  files: z
    .array(z.object({ name: z.string().trim().min(1).max(200), mime: z.string(), size: z.number().int().min(1) }))
    .min(1)
    .max(ATTACHMENT_MAX_FILES, ERROR_TOO_MANY),
});

// Η απάντηση του message_delete.
export const deletedSchema = z.object({ removedPaths: z.array(z.string()) });

// Η απάντηση του message_attachment_slots.
export const slotsSchema = z.object({ slots: z.array(z.object({ path: z.string(), name: z.string() })) });

export const editSchema = z.object({ id: idSchema, body: bodySchema });
export const deleteSchema = z.object({ id: idSchema });
export const tagSchema = z.object({ id: idSchema, productionId: optionalIdSchema });
