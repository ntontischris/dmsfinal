import { z } from "zod";

// Σχήματα των RPC των Προσκλήσεων, των Χρηστών πελάτη και του Ιστορικού email. Οι κλειδιά είναι camelCase
// (η βάση τα γράφει έτσι). Ό,τι δεν περνά το σχήμα δεν φτάνει στην οθόνη.

const named = z.object({ id: z.string(), name: z.string() });

export const invitationRowSchema = z.object({
  id: z.string(),
  kind: z.enum(["team", "client"]),
  email: z.string(),
  name: z.string(),
  locale: z.enum(["el", "en"]),
  roles: z.array(named),
  client: named.nullable(),
  invitedBy: named.nullable(),
  createdAt: z.string(),
  expiresAt: z.string(),
  status: z.enum(["pending", "accepted", "expired", "cancelled"]),
  acceptedAt: z.string().nullable(),
  existingUserId: z.string().nullable(),
});

export type InvitationRow = z.infer<typeof invitationRowSchema>;

export const clientUserRowSchema = z.object({
  userId: z.string(),
  name: z.string(),
  email: z.string(),
  roleId: z.string(),
  roleName: z.string(),
  joinedAt: z.string(),
  isCurrent: z.boolean(),
  invitedBy: named.nullable(),
  lastSignInAt: z.string().nullable(),
});

export type ClientUserRow = z.infer<typeof clientUserRowSchema>;

export const membershipRowSchema = z.object({
  clientId: z.string(),
  name: z.string(),
  roleName: z.string(),
  isCurrent: z.boolean(),
});

export type MembershipRow = z.infer<typeof membershipRowSchema>;

export const emailLogRowSchema = z.object({
  id: z.string(),
  kind: z.string(),
  toEmail: z.string(),
  subject: z.string(),
  status: z.enum(["sent", "failed", "suppressed"]),
  providerId: z.string(),
  error: z.string(),
  sentAt: z.string(),
});

export type EmailLogRow = z.infer<typeof emailLogRowSchema>;

export const removeResultSchema = z.object({
  deactivate: z.boolean(),
  signatoryWarning: z.boolean(),
});

// Τα ονόματα των Ρόλων πελάτη που μπορεί να δώσει ο συνδεδεμένος (μόνο όσα δεν ξεπερνούν τα δικά του).
export const roleChoiceSchema = z.object({ id: z.string(), name: z.string() });

// Η φόρμα πρόσκλησης: ό,τι στέλνει ο Χρήστης, ελεγμένο πριν φτάσει στη βάση.
export const inviteFormSchema = z.object({
  name: z.string().trim().min(1, "Γράψε ονοματεπώνυμο.").max(120, "Το όνομα είναι πολύ μακρύ."),
  email: z
    .string()
    .trim()
    .pipe(z.email("Γράψε ένα έγκυρο email."))
    .transform((value) => value.toLowerCase()),
  locale: z.enum(["el", "en"]).default("el"),
});

export const teamInviteSchema = inviteFormSchema.extend({
  roleIds: z.array(z.uuid()).min(1, "Διάλεξε τουλάχιστον έναν Ρόλο."),
});

export const clientInviteSchema = inviteFormSchema.extend({
  clientId: z.uuid(),
  roleId: z.uuid().optional(),
});

export const uuidSchema = z.uuid();
