import { z } from "zod";

import { idSchema, optionalIdSchema } from "./schemas";
import { REQUEST_KINDS } from "./view-schema";

// Φόρμες των Αιτημάτων. Τα όρια ταυτίζονται με της βάσης (έως 2.000 χαρακτήρες, σύνδεσμοι μόνο https).

export const REQUEST_TEXT_MAX = 2000;

const HTTPS_LINK = /^https:\/\/\S+$/;
const UNSAFE_LINK = /(^|[^a-z0-9])(http|ftp|file):\/\//i;

const noUnsafeLinks = (value: string): boolean => !UNSAFE_LINK.test(value);
const UNSAFE_LINK_MESSAGE =
  "Επιτρέπονται μόνο σύνδεσμοι που ξεκινούν με https://";

const optionalText = z
  .string()
  .trim()
  .max(REQUEST_TEXT_MAX, "Το κείμενο έχει το πολύ 2.000 χαρακτήρες.")
  .refine(noUnsafeLinks, UNSAFE_LINK_MESSAGE);

const optionalLink = z
  .string()
  .trim()
  .max(REQUEST_TEXT_MAX, "Ο σύνδεσμος έχει το πολύ 2.000 χαρακτήρες.")
  .refine(
    (value) => value === "" || HTTPS_LINK.test(value),
    UNSAFE_LINK_MESSAGE,
  );

export const markRequestSchema = z.object({
  id: idSchema,
  kind: z.enum(REQUEST_KINDS, "Διάλεξε είδος Αιτήματος."),
});

export const assignRequestSchema = z.object({
  id: idSchema,
  userId: optionalIdSchema,
});

export const closeDoneSchema = z
  .object({ id: idSchema, link: optionalLink, comment: optionalText })
  .refine((value) => value.link !== "" || value.comment !== "", {
    message: "Χρειάζεται τουλάχιστον ένα: σύνδεσμος ή σχόλιο.",
    path: ["comment"],
  });

export const closeRejectedSchema = z.object({
  id: idSchema,
  reply: optionalText.min(1, "Η απόρριψη θέλει απάντηση προς τον πελάτη."),
});

const titleSchema = z
  .string()
  .trim()
  .min(1, "Γράψε τίτλο.")
  .max(200, "Ο τίτλος έχει το πολύ 200 χαρακτήρες.");

// Τα πεδία του Παραδοτέου που δημιουργείται από το Αίτημα (τα ίδια με τη φόρμα του Παραδοτέου).
export const deliverableFromRequestSchema = z
  .object({
    id: idSchema,
    productionId: optionalIdSchema,
    kindId: z.uuid("Διάλεξε είδος Παροχής."),
    title: titleSchema,
    assigneeId: optionalIdSchema,
    filmingId: optionalIdSchema,
    charge: z
      .enum(["", "pending", "free"])
      .optional()
      .transform((value) => (value ? value : null)),
    chargeReason: z
      .string()
      .trim()
      .max(REQUEST_TEXT_MAX)
      .transform((value) => (value === "" ? null : value)),
  })
  .refine((value) => value.charge !== "free" || value.chargeReason !== null, {
    message: "Το «χωρίς χρέωση» θέλει λόγο.",
    path: ["chargeReason"],
  });

// Η απάντηση των RPC δημιουργίας: το id του νέου Παραδοτέου ή Γυρίσματος.
export const createdSchema = z.object({ id: idSchema });
