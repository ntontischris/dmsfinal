import { pick, type Locale } from "../locale";

import { renderShell, type RenderedBody } from "./shell";

// Τα emails εισόδου (ADR 0016): πρόσκληση, σύνδεσμος εισόδου, επαναφορά, αλλαγή email.
// Ο σύνδεσμος φτιάχνεται από το token_hash της Supabase και πάει στο /auth/confirm της εφαρμογής.

export interface EmailMessageBody extends RenderedBody {
  subject: string;
}

export interface InvitationInput {
  locale: Locale;
  origin: string;
  name: string;
  link: string;
  kind: "team" | "client";
  clientName?: string;
}

export function invitationMessage(input: InvitationInput): EmailMessageBody {
  const { locale } = input;
  const where = input.kind === "client" && input.clientName ? input.clientName : "Devre Media";
  const subject = pick(locale, `Πρόσκληση στο DMS: ${where}`, `Invitation to DMS: ${where}`);
  const greeting = pick(locale, `Γεια σου ${input.name},`, `Hello ${input.name},`);
  const body = pick(
    locale,
    input.kind === "client"
      ? `Σε προσκάλεσαν να δουλεύεις με τον Πελάτη «${where}» στο σύστημα της Devre Media.`
      : "Σε προσκάλεσαν να μπεις στο σύστημα της Devre Media.",
    input.kind === "client"
      ? `You were invited to work with the client “${where}” in the Devre Media system.`
      : "You were invited to join the Devre Media system.",
  );
  const rest = pick(
    locale,
    "Πάτα το κουμπί, όρισε τον κωδικό σου και μπες. Ο σύνδεσμος ισχύει 24 ώρες.",
    "Press the button, set your password and sign in. The link is valid for 24 hours.",
  );
  const rendered = renderShell({
    locale,
    origin: input.origin,
    heading: subject,
    paragraphs: [greeting, body, rest],
    action: { label: pick(locale, "Μπες στο σύστημα", "Open the system"), url: input.link },
  });
  return { subject, ...rendered };
}

export interface AuthLinkInput {
  locale: Locale;
  origin: string;
  type: "magiclink" | "recovery" | "email_change" | "signup";
  link: string;
}

const AUTH_COPY: Record<AuthLinkInput["type"], { el: [string, string]; en: [string, string] }> = {
  magiclink: {
    el: ["Σύνδεσμος εισόδου", "Πάτα το κουμπί για να μπεις. Ο σύνδεσμος ισχύει 24 ώρες και μπορεί να χρησιμοποιηθεί μία φορά."],
    en: ["Sign-in link", "Press the button to sign in. The link is valid for 24 hours and works once."],
  },
  recovery: {
    el: ["Επαναφορά κωδικού", "Πάτα το κουμπί για να ορίσεις νέο κωδικό. Αν δεν το ζήτησες, αγνόησε αυτό το μήνυμα."],
    en: ["Password reset", "Press the button to set a new password. If you did not ask for this, ignore this message."],
  },
  email_change: {
    el: ["Επιβεβαίωση νέου email", "Πάτα το κουμπί για να επιβεβαιώσεις την αλλαγή της διεύθυνσης email σου."],
    en: ["Confirm your new email", "Press the button to confirm the change of your email address."],
  },
  signup: {
    el: ["Επιβεβαίωση λογαριασμού", "Πάτα το κουμπί για να επιβεβαιώσεις τον λογαριασμό σου."],
    en: ["Confirm your account", "Press the button to confirm your account."],
  },
};

export function authLinkMessage(input: AuthLinkInput): EmailMessageBody {
  const [heading, text] = input.locale === "en" ? AUTH_COPY[input.type].en : AUTH_COPY[input.type].el;
  const rendered = renderShell({
    locale: input.locale,
    origin: input.origin,
    heading,
    paragraphs: [text],
    action: { label: pick(input.locale, "Συνέχεια", "Continue"), url: input.link },
  });
  return { subject: `Devre Media · ${heading}`, ...rendered };
}
