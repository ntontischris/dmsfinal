import { z } from "zod";

// Οι φόρμες των Ειδοποιήσεων (#171).

export const languageSchema = z.object({
  language: z.enum(["el", "en"], { message: "Διάλεξε Ελληνικά ή English" }),
});

// Το token της διακοπής: 64 ψηφία hex. Ό,τι άλλο δεν φτάνει στη βάση (η απάντηση είναι η ίδια).
export const unsubscribeTokenSchema = z.string().regex(/^[0-9a-f]{64}$/);
