import { z } from "zod";

import { toLocale, type Locale } from "./locale";
import { authLinkMessage, invitationMessage, type EmailMessageBody } from "./templates/auth-messages";

// Το σώμα του Send Email Hook της Supabase: ο παραλήπτης και τα tokens του email.
const hookSchema = z.object({
  user: z.object({
    email: z.string().email(),
    user_metadata: z
      .object({
        name: z.string().optional(),
        locale: z.string().optional(),
        kind: z.string().optional(),
        client_name: z.string().optional(),
      })
      .passthrough()
      .optional(),
  }),
  email_data: z.object({
    token_hash: z.string().min(1),
    email_action_type: z.string().min(1),
  }),
});

export type AuthHookPayload = z.infer<typeof hookSchema>;

export const parseAuthHookPayload = (raw: unknown) => hookSchema.safeParse(raw);

export interface AuthEmail {
  to: string;
  toName: string;
  type: string;
  message: EmailMessageBody;
}

// Ο σύνδεσμος πάει στο /auth/confirm της εφαρμογής (ίδιος δρόμος με τα υπόλοιπα συνδέσμων εισόδου).
export const confirmLink = (origin: string, tokenHash: string, type: string): string =>
  `${origin}/auth/confirm?token_hash=${encodeURIComponent(tokenHash)}&type=${encodeURIComponent(type)}`;

const SUPPORTED = ["invite", "magiclink", "recovery", "email_change", "signup"] as const;
type SupportedType = (typeof SUPPORTED)[number];
const isSupported = (value: string): value is SupportedType => SUPPORTED.some((type) => type === value);

const recipientOf = (payload: AuthHookPayload): { name: string; locale: Locale } => ({
  name: payload.user.user_metadata?.name?.trim() || payload.user.email,
  locale: toLocale(payload.user.user_metadata?.locale),
});

// Κάθε τύπος email της Supabase γίνεται δικό μας μήνυμα. Άγνωστος τύπος → null (απορρίπτεται).
export function buildAuthEmail(payload: AuthHookPayload, origin: string): AuthEmail | null {
  const type = payload.email_data.email_action_type;
  if (!isSupported(type)) return null;
  const link = confirmLink(origin, payload.email_data.token_hash, type);
  const { name, locale } = recipientOf(payload);
  const message =
    type === "invite"
      ? invitationMessage({
          locale,
          origin,
          name,
          link,
          kind: payload.user.user_metadata?.kind === "client" ? "client" : "team",
          clientName: payload.user.user_metadata?.client_name,
        })
      : authLinkMessage({ locale, origin, type, link });
  return { to: payload.user.email, toName: name, type, message };
}
