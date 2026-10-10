import { pick, type Locale } from "../locale";

import type { EmailMessageBody } from "./auth-messages";
import { renderShell } from "./shell";

// Μηνύματα της ουράς (ΧΩΡΙΣ σύνδεσμο εισόδου εκτός από την προσθήκη σε Πελάτη).

export interface TestInput {
  locale: Locale;
  origin: string;
}

export function testMessage(input: TestInput): EmailMessageBody {
  const heading = pick(input.locale, "Δοκιμαστικό email", "Test email");
  const rendered = renderShell({
    locale: input.locale,
    origin: input.origin,
    heading,
    paragraphs: [
      pick(
        input.locale,
        "Αν διαβάζεις αυτό, η αποστολή email του DMS λειτουργεί.",
        "If you can read this, sending email from DMS works.",
      ),
    ],
  });
  return { subject: `Devre Media · ${heading}`, ...rendered };
}

export interface ClientAddedInput {
  locale: Locale;
  origin: string;
  name: string;
  clientName: string;
  link: string;
}

export function clientAddedMessage(input: ClientAddedInput): EmailMessageBody {
  const { locale } = input;
  const heading = pick(locale, `Πρόσβαση στον Πελάτη ${input.clientName}`, `Access to client ${input.clientName}`);
  const rendered = renderShell({
    locale,
    origin: input.origin,
    heading,
    paragraphs: [
      pick(locale, `Γεια σου ${input.name},`, `Hello ${input.name},`),
      pick(
        locale,
        `Πρόσθεσαν τον λογαριασμό σου στον Πελάτη «${input.clientName}». Μπορείς να μπεις και να διαλέξεις τον Πελάτη από την κεφαλίδα.`,
        `Your account was added to the client “${input.clientName}”. Sign in and choose the client from the header.`,
      ),
    ],
    action: { label: pick(locale, "Μπες στο σύστημα", "Open the system"), url: input.link },
  });
  return { subject: `Devre Media · ${heading}`, ...rendered };
}

export type DecisionKind = "filming_decision" | "reschedule_decision";
export type DecisionOutcome = "approved" | "rejected";

export interface DecisionInput {
  locale: Locale;
  origin: string;
  name: string;
  kind: DecisionKind;
  filmingId: string;
  decision: DecisionOutcome;
  startsAt: string;
  previousStartsAt: string | null;
  hours: number;
  reason: string | null;
}

interface BilingualText {
  el: string;
  en: string;
}

const DECISION_TITLES: Record<DecisionKind, Record<DecisionOutcome, BilingualText>> = {
  filming_decision: {
    approved: { el: "Το Γύρισμά σου εγκρίθηκε", en: "Your filming has been approved" },
    rejected: { el: "Το Γύρισμά σου δεν εγκρίθηκε", en: "Your filming was not approved" },
  },
  reschedule_decision: {
    approved: { el: "Η μετάθεση εγκρίθηκε", en: "Your reschedule was approved" },
    rejected: { el: "Η μετάθεση δεν εγκρίθηκε", en: "Your reschedule was not approved" },
  },
};

// Η ώρα της Αθήνας, όχι του διακομιστή: ο χρήστης βλέπει πάντα την τοπική του ώρα.
const formatAthens = (locale: Locale, iso: string): string =>
  new Intl.DateTimeFormat(pick(locale, "el-GR", "en-GB"), {
    timeZone: "Europe/Athens",
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).format(new Date(iso));

const hoursLabel = (locale: Locale, hours: number): string => {
  if (hours === 1) return pick(locale, "1 ώρα", "1 hour");
  return pick(locale, `${hours} ώρες`, `${hours} hours`);
};

function decisionSentence(input: DecisionInput, when: string): string {
  const { locale, kind, decision } = input;
  if (kind === "filming_decision" && decision === "approved") {
    const duration = hoursLabel(locale, input.hours);
    return pick(locale, `Το γύρισμα είναι προγραμματισμένο για ${when}. Διάρκεια: ${duration}.`, `Your filming is scheduled for ${when}. Duration: ${duration}.`);
  }
  if (kind === "filming_decision") {
    return pick(locale, `Το αίτημα γυρίσματος για ${when} δεν εγκρίθηκε.`, `The filming request for ${when} was not approved.`);
  }
  if (decision === "approved") {
    const duration = hoursLabel(locale, input.hours);
    return pick(locale, `Το γύρισμα μετατέθηκε για ${when}. Διάρκεια: ${duration}.`, `Your filming was moved to ${when}. Duration: ${duration}.`);
  }
  return pick(locale, `Η αίτηση μετάθεσης δεν εγκρίθηκε. Το γύρισμα μένει για ${when}.`, `The reschedule request was not approved. The filming stays at ${when}.`);
}

function decisionParagraphs(input: DecisionInput): string[] {
  const { locale } = input;
  const when = formatAthens(locale, input.startsAt);
  const paragraphs = [pick(locale, `Γεια σου ${input.name},`, `Hello ${input.name},`), decisionSentence(input, when)];
  if (input.kind === "reschedule_decision" && input.decision === "approved" && input.previousStartsAt) {
    const previous = formatAthens(locale, input.previousStartsAt);
    paragraphs.push(pick(locale, `Η προηγούμενη ώρα ήταν ${previous}.`, `The previous time was ${previous}.`));
  }
  if (input.decision === "rejected" && input.reason) {
    paragraphs.push(pick(locale, `Αιτιολογία: ${input.reason}`, `Reason: ${input.reason}`));
  }
  return paragraphs;
}

export function decisionMessage(input: DecisionInput): EmailMessageBody {
  const { locale } = input;
  const title = DECISION_TITLES[input.kind][input.decision];
  const heading = pick(locale, title.el, title.en);
  const rendered = renderShell({
    locale,
    origin: input.origin,
    heading,
    paragraphs: decisionParagraphs(input),
    action: {
      label: pick(locale, "Δες το γύρισμα", "View the filming"),
      url: `${input.origin}/app/filming/${encodeURIComponent(input.filmingId)}`,
    },
  });
  return { subject: `Devre Media · ${heading}`, ...rendered };
}
