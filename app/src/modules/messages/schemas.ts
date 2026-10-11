import { z } from "zod";

// Φόρμες των Μηνυμάτων. Τα όρια ταυτίζονται με της βάσης (1..4.000 χαρακτήρες, σύνδεσμοι μόνο https).

export const MESSAGE_MAX_LENGTH = 4000;

// Ίδιος κανόνας με το authz.message_clean_body: τα http://, ftp:// και file:// απορρίπτονται.
const UNSAFE_LINK = /(^|[^a-z0-9])(http|ftp|file):\/\//i;

export const bodySchema = z
  .string()
  .trim()
  .min(1, "Γράψε το Μήνυμα.")
  .max(MESSAGE_MAX_LENGTH, "Το Μήνυμα έχει το πολύ 4.000 χαρακτήρες.")
  .refine((value) => !UNSAFE_LINK.test(value), "Επιτρέπονται μόνο σύνδεσμοι που ξεκινούν με https://");

const idSchema = z.uuid("Άκυρο στοιχείο.");
const optionalIdSchema = z.union([z.literal("").transform(() => null), idSchema]);

export const sendSchema = z
  .object({
    clientId: idSchema,
    productionId: optionalIdSchema,
    body: bodySchema,
    internal: z.boolean(),
    mentions: z.array(idSchema),
  })
  .refine((value) => value.internal || value.mentions.length === 0, {
    message: "Οι αναφορές επιτρέπονται μόνο σε Εσωτερικά Μηνύματα.",
  });

export const editSchema = z.object({ id: idSchema, body: bodySchema });
export const deleteSchema = z.object({ id: idSchema });
export const tagSchema = z.object({ id: idSchema, productionId: optionalIdSchema });
