import { z } from "zod";

// Κανόνες εισόδου (κεφ. 9, «Ιστοσελίδα: λεπτομέρειες κανόνων»): κωδικός 10+ χαρακτήρες.
export const MIN_PASSWORD = 10;

export const emailSchema = z.email("Γράψε ένα έγκυρο email.");

export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, "Γράψε τον κωδικό σου."),
});

export const newPasswordSchema = z
  .object({
    password: z.string().min(MIN_PASSWORD, `Ο κωδικός θέλει τουλάχιστον ${MIN_PASSWORD} χαρακτήρες.`),
    confirm: z.string(),
  })
  .refine((value) => value.password === value.confirm, {
    message: "Οι δύο κωδικοί δεν ταιριάζουν.",
    path: ["confirm"],
  });

// Επιστροφή μετά την είσοδο μόνο μέσα στο σύστημα: ποτέ σε εξωτερική διεύθυνση.
export const safeNext = (next: string | null | undefined): string =>
  next && next.startsWith("/app") && !next.startsWith("//") ? next : "/app";

// Η απάντηση μιας φόρμας εισόδου: ένα λάθος ή μια ουδέτερη ενημέρωση.
export interface FormState {
  error?: string;
  notice?: string;
}

export const INITIAL_FORM_STATE: FormState = {};
