import { z } from "zod";

import { toLocale, type Locale } from "./locale";
import { chooseText, type SystemMessageCode, type SystemTextsMap } from "./system-texts";
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
    redirect_to: z.string().optional(),
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
export const confirmLink = (origin: string, tokenHash: string, type: string, next?: string): string =>
  `${origin}/auth/confirm?token_hash=${encodeURIComponent(tokenHash)}&type=${encodeURIComponent(type)}${
    next ? `&next=${encodeURIComponent(next)}` : ""
  }`;

// Η διαδρομή της εφαρμογής όπου πάει ο Χρήστης μετά, μόνο αν το redirect_to είναι της ίδιας εφαρμογής.
export const nextPathFor = (redirectTo: string | undefined, origin: string): string | undefined => {
  if (!redirectTo) return undefined;
  try {
    const url = new URL(redirectTo);
    return url.origin === origin ? `${url.pathname}${url.search}` : undefined;
  } catch {
    return undefined;
  }
};

// Η αλλαγή email δεν υποστηρίζεται ακόμα (θέλει δύο συνδέσμους)· ό,τι άλλο δεν είναι στη λίστα απορρίπτεται.
const SUPPORTED = ["invite", "magiclink", "recovery", "signup"] as const;
type SupportedType = (typeof SUPPORTED)[number];
const isSupported = (value: string): value is SupportedType => SUPPORTED.some((type) => type === value);

const recipientOf = (payload: AuthHookPayload): { name: string; locale: Locale } => ({
  name: payload.user.user_metadata?.name?.trim() || payload.user.email,
  locale: toLocale(payload.user.user_metadata?.locale),
});

// Το Μήνυμα συστήματος (K2, #173) κάθε τύπου· η επιβεβαίωση λογαριασμού δεν αλλάζει από τον admin.
const SYSTEM_CODE: Record<SupportedType, SystemMessageCode | null> = {
  invite: "invite",
  magiclink: "magic_link",
  recovery: "recovery",
  signup: null,
};

// Κάθε τύπος email της Supabase γίνεται δικό μας μήνυμα. Άγνωστος τύπος → null (απορρίπτεται).
// Τα κείμενα του admin (texts) μπαίνουν όπου υπάρχουν· αλλιώς φεύγει το κείμενο του κώδικα.
export function buildAuthEmail(payload: AuthHookPayload, origin: string, texts: SystemTextsMap = {}): AuthEmail | null {
  const type = payload.email_data.email_action_type;
  if (!isSupported(type)) return null;
  const link = confirmLink(origin, payload.email_data.token_hash, type, nextPathFor(payload.email_data.redirect_to, origin));
  const recipient = recipientOf(payload);
  const code = SYSTEM_CODE[type];
  const chosen = chooseText(recipient.locale, code ? texts[code] : undefined);
  const base = { locale: chosen.locale, origin, name: recipient.name, link, custom: chosen };
  const message =
    type === "invite"
      ? invitationMessage({
          ...base,
          kind: payload.user.user_metadata?.kind === "client" ? "client" : "team",
          clientName: payload.user.user_metadata?.client_name,
        })
      : authLinkMessage({ ...base, type });
  return { to: payload.user.email, toName: recipient.name, type, message };
}
