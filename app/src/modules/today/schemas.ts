import { z } from "zod";

// Η φόρμα της Προσαρμογής: η σειρά όλων των καρτών και όσες κρύβονται. Η βάση κρατά μόνο όσες βλέπει ο Χρήστης.

const cardCodeSchema = z
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

// «Αργότερα» (#241 Σ8): το κλειδί μιας απόφασης = κωδικός κάρτας + ':' + id της γραμμής (ίδιος έλεγχος με τη βάση).
export const itemKeySchema = z
  .string()
  .regex(/^[a-z][a-z0-9_]{0,39}:\S{1,200}$/, "Άγνωστη απόφαση");

// Η «Αναίρεση» φέρνει πίσω όσες κρύφτηκαν (μία ή όλες της λίστας).
export const itemKeysSchema = z
  .array(itemKeySchema)
  .min(1, "Άγνωστη απόφαση")
  .max(50, "Πάρα πολλές αποφάσεις");
