import { pick, type Locale } from "../locale";

import type { EmailMessageBody } from "./auth-messages";
import { renderShell } from "./shell";

// Τα email των Μηνυμάτων (#164) προς Χρήστες πελάτη. Το σώμα δεν περιέχει το κείμενο των Μηνυμάτων, μόνο πλήθος.

const MESSAGES_PATH = "/app/messages";
const REQUESTS_PATH = "/app/messages?tab=requests";

export interface MessageDigestInput {
  locale: Locale;
  origin: string;
  name: string;
  clientName: string;
  count: number;
}

export function messageDigestMessage(
  input: MessageDigestInput,
): EmailMessageBody {
  const { locale, count } = input;
  const subject =
    count === 1
      ? pick(locale, "Έχετε 1 αδιάβαστο Μήνυμα", "You have 1 unread message")
      : pick(
          locale,
          `Έχετε ${count} αδιάβαστα Μηνύματα`,
          `You have ${count} unread messages`,
        );
  const rendered = renderShell({
    locale,
    origin: input.origin,
    heading: subject,
    paragraphs: [
      pick(locale, `Γεια σου ${input.name},`, `Hello ${input.name},`),
      pick(
        locale,
        `Η ομάδα έγραψε στη Συνομιλία του Πελάτη ${input.clientName} και δεν τα έχεις διαβάσει ακόμα.`,
        `The team wrote in the conversation of ${input.clientName} and you have not read it yet.`,
      ),
      pick(
        locale,
        "Η απάντηση σε αυτό το email δεν φτάνει στην ομάδα. Απάντησε μέσα από το DMS.",
        "A reply to this email does not reach the team. Please reply inside the DMS.",
      ),
    ],
    action: {
      label: pick(locale, "Απάντησε στο DMS", "Reply in the DMS"),
      url: `${input.origin}${MESSAGES_PATH}`,
    },
  });
  return { subject, ...rendered };
}

export type RequestOutcome = "done" | "rejected";
export type RequestKind = "deliverable" | "filming" | "other";

export interface RequestClosedInput {
  locale: Locale;
  origin: string;
  name: string;
  clientName: string;
  kind: RequestKind;
  outcome: RequestOutcome;
  reply: string | null;
  comment: string | null;
  link: string | null;
  deliverableId: string | null;
}

const KIND_LABEL: Readonly<Record<RequestKind, { el: string; en: string }>> = {
  deliverable: { el: "νέο Παραδοτέο", en: "new deliverable" },
  filming: { el: "Γύρισμα", en: "filming" },
  other: { el: "άλλο", en: "other" },
};

const optionalLine = (text: string | null, label: string): string[] =>
  text ? [`${label}: ${text}`] : [];

// Οι παράγραφοι του κλεισίματος χωρίς τον χαιρετισμό: ίδιες στο παλιό email και στο μπλοκ του Αυτοματισμού (#171).
export function requestClosedDetails(input: RequestClosedInput): string[] {
  const { locale } = input;
  const isDone = input.outcome === "done";
  const deliverableUrl = input.deliverableId
    ? `${input.origin}/app/deliverables/${encodeURIComponent(input.deliverableId)}`
    : null;
  return [
      pick(
        locale,
        `Αίτημα (${KIND_LABEL[input.kind].el}) του Πελάτη ${input.clientName}: ${isDone ? "ολοκληρώθηκε" : "απορρίφθηκε"}.`,
        `Request (${KIND_LABEL[input.kind].en}) of ${input.clientName}: ${isDone ? "done" : "declined"}.`,
      ),
      ...optionalLine(
        input.reply,
        pick(locale, "Απάντηση ομάδας", "Reply from the team"),
      ),
      ...optionalLine(input.comment, pick(locale, "Σχόλιο", "Comment")),
      ...optionalLine(input.link, pick(locale, "Σύνδεσμος", "Link")),
      ...optionalLine(
        deliverableUrl,
        pick(locale, "Το Παραδοτέο", "The deliverable"),
      ),
  ];
}

export function requestClosedMessage(
  input: RequestClosedInput,
): EmailMessageBody {
  const { locale } = input;
  const subject =
    input.outcome === "done"
      ? pick(locale, "Το Αίτημά σας ολοκληρώθηκε", "Your request is done")
      : pick(locale, "Το Αίτημά σας απορρίφθηκε", "Your request was declined");
  const rendered = renderShell({
    locale,
    origin: input.origin,
    heading: subject,
    paragraphs: [
      pick(locale, `Γεια σου ${input.name},`, `Hello ${input.name},`),
      ...requestClosedDetails(input),
    ],
    action: {
      label: pick(locale, "Δες τα Αιτήματά σου", "View your requests"),
      url: `${input.origin}${REQUESTS_PATH}`,
    },
  });
  return { subject, ...rendered };
}
