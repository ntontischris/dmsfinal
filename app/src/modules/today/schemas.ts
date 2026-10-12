import { z } from "zod";

// Η φόρμα της Προσαρμογής: η σειρά όλων των καρτών και όσες κρύβονται. Η βάση κρατά μόνο όσες βλέπει ο Χρήστης.

export const cardCodeSchema = z
  .string()
  .regex(/^[a-z][a-z0-9_]{0,39}$/, "Άγνωστη κάρτα");

const codesSchema = z
  .array(cardCodeSchema)
  .max(100, "Πάρα πολλές κάρτες στην Προσαρμογή");

export const prefsSchema = z.object({
  order: codesSchema,
  hidden: codesSchema,
});

export type PrefsInput = z.infer<typeof prefsSchema>;
