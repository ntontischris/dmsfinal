import { z } from "zod";

// Τα πεδία των φορμών του Google. Ό,τι έρχεται από τη φόρμα ελέγχεται εδώ πριν φτάσει στη βάση.

export const rulesFormSchema = z.object({
  newEvent: z.enum(["blocked", "none"], { message: "Ο κανόνας νέου γεγονότος δεν είναι έγκυρος" }),
  deleteHours: z.enum(["12", "24", "48"], { message: "Η προθεσμία είναι 12, 24 ή 48 ώρες" }).transform(Number),
  writePending: z.boolean(),
});

export const deletionFormSchema = z.object({
  filmingId: z.uuid({ message: "Το Γύρισμα δεν βρέθηκε" }),
  restore: z.boolean(),
  reason: z.string().max(500),
});

export const sharedWithSchema = z.email({ message: "Γράψε ένα έγκυρο email" });
