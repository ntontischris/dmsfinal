import type { Locale } from "./locale";

// Τα Μηνύματα συστήματος (K2, #173): ο admin αλλάζει θέμα και κείμενο el/en· null = το κείμενο του κώδικα.
// Οι μεταβλητές και οι υποχρεωτικές είναι ίδιες με το authz.system_message_spec της βάσης.
// Το κουμπί (σύνδεσμος) και ο κωδικός μπαίνουν πάντα από τον κώδικα, όποιο κείμενο κι αν γράψει ο admin.

export const SYSTEM_MESSAGE_CODES = [
  "invite",
  "magic_link",
  "recovery",
  "signing_code",
  "proposal_link",
  "signed_copy",
  "client_added",
] as const;

export type SystemMessageCode = (typeof SYSTEM_MESSAGE_CODES)[number];

export const isSystemMessageCode = (
  value: string,
): value is SystemMessageCode =>
  SYSTEM_MESSAGE_CODES.some((code) => code === value);

export interface SystemTexts {
  subjectEl: string | null;
  subjectEn: string | null;
  bodyEl: string | null;
  bodyEn: string | null;
}

export type SystemTextsMap = Partial<Record<SystemMessageCode, SystemTexts>>;

export const SYSTEM_SPECS: Record<
  SystemMessageCode,
  { variables: readonly string[]; required: readonly string[] }
> = {
  invite: { variables: ["recipientName", "place", "link"], required: [] },
  magic_link: { variables: ["recipientName", "link"], required: [] },
  recovery: { variables: ["recipientName", "link"], required: [] },
  signing_code: {
    variables: ["recipientName", "agreement", "code"],
    required: ["code"],
  },
  proposal_link: {
    variables: ["recipientName", "agreement", "link"],
    required: [],
  },
  signed_copy: {
    variables: ["recipientName", "agreement", "manager"],
    required: [],
  },
  client_added: {
    variables: ["recipientName", "clientName", "link"],
    required: [],
  },
};

// Το κείμενο του admin για έναν παραλήπτη, στη γλώσσα που θα φύγει.
export interface CustomText {
  subject: string | null;
  body: string | null;
}

export interface ChosenText extends CustomText {
  locale: Locale;
}

const hasText = (value: string | null | undefined): value is string =>
  !!value && value.trim().length > 0;

// Το κείμενο του admin στη γλώσσα του παραλήπτη. Κάθε πεδίο που λείπει (null) παίρνει το κείμενο του κώδικα στην ίδια
// γλώσσα, που υπάρχει πάντα και στα δύο: έτσι ένα αλλαγμένο ελληνικό δεν στέλνει ποτέ ελληνικά σε αγγλόφωνο.
export function chooseText(
  locale: Locale,
  texts: SystemTexts | undefined,
): ChosenText {
  if (locale === "en")
    return {
      locale,
      subject: texts?.subjectEn ?? null,
      body: texts?.bodyEn ?? null,
    };
  return {
    locale,
    subject: texts?.subjectEl ?? null,
    body: texts?.bodyEl ?? null,
  };
}

// Οι μεταβλητές που δεν μπαίνουν ποτέ σε θέμα: σύνδεσμοι και κωδικοί (το θέμα φαίνεται σε λίστες και ειδοποιήσεις).
export const SUBJECT_FORBIDDEN: readonly string[] = ["link", "code"];

export const forbiddenInSubject = (text: string): string[] =>
  [...text.matchAll(/\{([A-Za-z]+)\}/g)]
    .map((match) => match[1] ?? "")
    .filter((name) => SUBJECT_FORBIDDEN.includes(name));

// {μεταβλητή} → τιμή, σε ένα πέρασμα· άγνωστη ή χωρίς τιμή φεύγει (όπως το authz.ev_render). Το escaping το κάνει το κέλυφος.
export const fillTemplate = (
  text: string,
  values: Readonly<Record<string, string>>,
): string =>
  text
    .replace(/\{([A-Za-z]+)\}/g, (_whole, name: string) => values[name] ?? "")
    .trim();

// Οι παράγραφοι: χωρίζονται με κενή γραμμή, χωρίς κενές.
export const textParagraphs = (body: string): string[] =>
  body
    .split(/\r?\n\s*\r?\n/)
    .map((part) => part.trim())
    .filter((part) => part.length > 0);

export interface MessageParts {
  heading: string;
  subject: string;
  paragraphs: readonly string[];
}

// Το μήνυμα του κώδικα με το κείμενο του admin όπου υπάρχει. Το θέμα είναι μία γραμμή και γίνεται και επικεφαλίδα.
export function customizeParts(
  base: MessageParts,
  custom: CustomText | undefined,
  values: Readonly<Record<string, string>>,
): MessageParts {
  const subject = hasText(custom?.subject)
    ? fillTemplate(custom.subject, values).replace(/\s*[\r\n]+\s*/g, " ")
    : null;
  const body = hasText(custom?.body)
    ? textParagraphs(fillTemplate(custom.body, values))
    : null;
  return {
    heading: subject || base.heading,
    subject: subject || base.subject,
    paragraphs: body && body.length > 0 ? body : base.paragraphs,
  };
}

// Οι άγνωστες μεταβλητές ενός κειμένου (ίδιο μοτίβο με τη βάση).
export const unknownVariables = (
  text: string,
  allowed: readonly string[],
): string[] =>
  [...text.matchAll(/\{([A-Za-z]+)\}/g)]
    .map((match) => match[1] ?? "")
    .filter((name) => !allowed.includes(name));

// Οι υποχρεωτικές μεταβλητές που λείπουν από ένα κείμενο.
export const missingRequired = (
  text: string,
  required: readonly string[],
): string[] => required.filter((name) => !text.includes(`{${name}}`));
