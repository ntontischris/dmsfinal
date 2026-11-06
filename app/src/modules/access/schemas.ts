import { z } from "zod";

// Κανόνες εισόδου (κεφ. 9, «Ιστοσελίδα: λεπτομέρειες κανόνων»): κωδικός 10+ χαρακτήρες.
export const MIN_PASSWORD = 10;

export const emailSchema = z.email("Γράψε ένα έγκυρο email.");

export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, "Γράψε τον κωδικό σου."),
});

const newPasswordFields = {
  password: z.string().min(MIN_PASSWORD, `Ο κωδικός θέλει τουλάχιστον ${MIN_PASSWORD} χαρακτήρες.`),
  confirm: z.string(),
};
const samePair = (value: { password: string; confirm: string }) => value.password === value.confirm;
const pairMismatch = { message: "Οι δύο κωδικοί δεν ταιριάζουν.", path: ["confirm"] };

// Νέος κωδικός από σύνδεσμο email (πρόσκληση, επαναφορά).
export const newPasswordSchema = z.object(newPasswordFields).refine(samePair, pairMismatch);

// Αλλαγή από το Προφίλ: ζητά και τον τωρινό κωδικό.
export const changePasswordSchema = z
  .object({ ...newPasswordFields, current: z.string().min(1, "Γράψε τον τωρινό σου κωδικό.") })
  .refine(samePair, pairMismatch);

// Επιστροφή μετά την είσοδο μόνο μέσα στο σύστημα: ποτέ σε εξωτερική διεύθυνση.
export const safeNext = (next: string | null | undefined): string =>
  next && next.startsWith("/app") && !next.startsWith("//") ? next : "/app";

export type { FormState } from "@/lib/form-state";
export { INITIAL_FORM_STATE } from "@/lib/form-state";
