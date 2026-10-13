import { z } from "zod";

import { ITEM_KINDS } from "./view-schema";

// Φόρμες της Γνώσης. Τα όρια ταυτίζονται με της βάσης (20261017100000_knowledge.sql).

export const idSchema = z.uuid("Άκυρο στοιχείο.");

export const sectionSchema = z.object({
  id: z.union([z.literal("").transform(() => null), idSchema]),
  name: z
    .string()
    .trim()
    .min(1, "Γράψε το όνομα της Ενότητας.")
    .max(80, "Το όνομα της Ενότητας έχει έως 80 χαρακτήρες."),
  description: z
    .string()
    .trim()
    .max(240, "Η περιγραφή είναι μία πρόταση, έως 240 χαρακτήρες."),
});

export const moveSchema = z.object({
  id: idSchema,
  direction: z.enum(["up", "down"]),
});

const titleSchema = z
  .string()
  .trim()
  .min(1, "Γράψε τίτλο.")
  .max(160, "Ο τίτλος έχει έως 160 χαρακτήρες.");

export const newItemSchema = z.object({
  sectionId: z.uuid("Διάλεξε Ενότητα."),
  kind: z.enum(ITEM_KINDS, "Διάλεξε Άρθρο ή Αρχείο."),
  title: titleSchema,
});

export const itemSchema = z.object({
  id: idSchema,
  sectionId: idSchema,
  title: titleSchema,
  summary: z
    .string()
    .trim()
    .max(400, "Η Περίληψη είναι 1–2 γραμμές, έως 400 χαρακτήρες."),
  body: z.string().max(100000, "Το κείμενο ξεπερνά τους 100.000 χαρακτήρες."),
});

export const audienceSchema = z.object({
  id: idSchema,
  roles: z.array(idSchema).max(50),
  isPublic: z.boolean(),
});

export const uploadRequestSchema = z.object({
  itemId: idSchema,
  purpose: z.enum(["file", "image"]),
  mime: z.string().max(200),
  size: z.number().int().min(1),
});

// Η διαδρομή που έδωσε η βάση: <στοιχείο>/file-<uuid>.<επέκταση>.
export const attachSchema = z.object({
  itemId: idSchema,
  path: z
    .string()
    .regex(
      /^[0-9a-f-]{36}\/file-[0-9a-f-]{36}\.[a-z]{3,4}$/,
      "Το αρχείο δεν ανέβηκε σωστά.",
    ),
  name: z.string().trim().min(1).max(200),
});

export const slotSchema = z.object({ path: z.string() });
export const removedSchema = z.object({ removedPaths: z.array(z.string()) });
export const previousSchema = z.object({ previousPath: z.string().nullable() });
export const createdSchema = z.object({ id: z.string() });
