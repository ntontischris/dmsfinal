import { pick, type Locale } from "../locale";

import type { EmailMessageBody } from "./auth-messages";
import { renderShell } from "./shell";

// Μηνύματα του Δελτίου γυρίσματος (#136). Ημερομηνίες χωρίς ημέρα της εβδομάδας (σταθερό αποτέλεσμα μεταξύ ICU), ώρα Ελλάδας.

export interface SheetIssuedInput {
  locale: Locale;
  origin: string;
  name: string;
  filmingId: string;
  version: number;
  startsAt: string;
  hours: number;
  location: string | null;
  production: string;
  change: string | null;
}

export interface CrewDeclinedInput {
  locale: Locale;
  origin: string;
  name: string;
  filmingId: string;
  member: string;
  reason: string | null;
  startsAt: string;
  production: string;
}

const formatWhen = (locale: Locale, iso: string): string =>
  new Intl.DateTimeFormat(pick(locale, "el-GR", "en-GB"), {
    timeZone: "Europe/Athens",
    day: "numeric",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).format(new Date(iso));

const formatDay = (locale: Locale, iso: string): string =>
  new Intl.DateTimeFormat(pick(locale, "el-GR", "en-GB"), {
    timeZone: "Europe/Athens",
    day: "numeric",
    month: "long",
  }).format(new Date(iso));

const hoursText = (locale: Locale, hours: number): string => {
  if (hours === 1) return pick(locale, "1 ώρα", "1 hour");
  return pick(locale, `${hours} ώρες`, `${hours} hours`);
};

const filmingUrl = (origin: string, filmingId: string): string =>
  `${origin}/app/filming/${encodeURIComponent(filmingId)}`;

// Οι παράγραφοι του Δελτίου χωρίς τον χαιρετισμό: ίδιες στο παλιό email και στο μπλοκ του Αυτοματισμού (#171).
export function sheetIssuedDetails(input: SheetIssuedInput): string[] {
  const { locale } = input;
  const when = formatWhen(locale, input.startsAt);
  const paragraphs = [
    pick(
      locale,
      `Έκδοση ${input.version} του Δελτίου για το γύρισμα «${input.production}»: ${when}, ${hoursText(locale, input.hours)}, ${input.location ?? "χωρίς τοποθεσία"}.`,
      `Version ${input.version} of the sheet for “${input.production}”: ${when}, ${hoursText(locale, input.hours)}, ${input.location ?? "no location"}.`,
    ),
  ];
  if (input.change) {
    paragraphs.push(pick(locale, `Τι άλλαξε: ${input.change}`, `What changed: ${input.change}`));
  }
  return paragraphs;
}

export function sheetIssuedMessage(input: SheetIssuedInput): EmailMessageBody {
  const { locale } = input;
  const subject = pick(
    locale,
    `Δελτίο γυρίσματος · ${input.production} · ${formatDay(locale, input.startsAt)}`,
    `Filming sheet · ${input.production} · ${formatDay(locale, input.startsAt)}`,
  );
  const paragraphs = [pick(locale, `Γεια σου ${input.name},`, `Hello ${input.name},`), ...sheetIssuedDetails(input)];
  const rendered = renderShell({
    locale,
    origin: input.origin,
    heading: pick(locale, "Δελτίο γυρίσματος", "Filming sheet"),
    paragraphs,
    action: {
      label: pick(locale, "Άνοιγμα και επιβεβαίωση", "Open and confirm"),
      url: filmingUrl(input.origin, input.filmingId),
    },
  });
  return { subject, ...rendered };
}

const crewDeclinedSubject = (input: CrewDeclinedInput): string => {
  const day = formatDay(input.locale, input.startsAt);
  return pick(
    input.locale,
    `${input.member} δεν μπορεί στο Γύρισμα ${input.production} ${day}`,
    `${input.member} cannot attend the filming ${input.production} ${day}`,
  );
};

// Οι παράγραφοι του «δεν μπορώ» χωρίς τον χαιρετισμό (#171).
export function crewDeclinedDetails(input: CrewDeclinedInput): string[] {
  const paragraphs = [crewDeclinedSubject(input) + "."];
  if (input.reason) {
    paragraphs.push(pick(input.locale, `Λόγος: ${input.reason}`, `Reason: ${input.reason}`));
  }
  return paragraphs;
}

export function crewDeclinedMessage(input: CrewDeclinedInput): EmailMessageBody {
  const { locale } = input;
  const subject = crewDeclinedSubject(input);
  const paragraphs = [pick(locale, `Γεια σου ${input.name},`, `Hello ${input.name},`), ...crewDeclinedDetails(input)];
  const rendered = renderShell({
    locale,
    origin: input.origin,
    heading: subject,
    paragraphs,
    action: {
      label: pick(locale, "Δες το Γύρισμα", "View the filming"),
      url: filmingUrl(input.origin, input.filmingId),
    },
  });
  return { subject, ...rendered };
}
