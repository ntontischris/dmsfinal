import { pick, type Locale } from "../locale";

import type { EmailMessageBody } from "./auth-messages";
import { renderShell } from "./shell";

// Μήνυμα «Νέα Έκδοση για έγκριση» προς τον Πελάτη (#142). Το όριο γύρων δείχνεται μόνο αν υπάρχει.

export interface DeliverableVersionInput {
  locale: Locale;
  origin: string;
  name: string;
  deliverableId: string;
  title: string;
  production: string;
  version: number;
  roundsUsed: number;
  roundsLimit: number | null;
}

const deliverableUrl = (origin: string, deliverableId: string): string =>
  `${origin}/app/deliverables/${encodeURIComponent(deliverableId)}`;

const roundsText = (input: DeliverableVersionInput): string | null => {
  if (input.roundsLimit === null) return null;
  return pick(
    input.locale,
    `Γύροι αλλαγών: ${input.roundsUsed} από ${input.roundsLimit}.`,
    `Change rounds: ${input.roundsUsed} of ${input.roundsLimit}.`,
  );
};

// Οι παράγραφοι της Έκδοσης χωρίς τον χαιρετισμό: ίδιες στο παλιό email και στο μπλοκ του Αυτοματισμού (#171).
export function deliverableVersionDetails(input: DeliverableVersionInput): string[] {
  const { locale } = input;
  const paragraphs = [
    pick(
      locale,
      `Η Έκδοση ${input.version} του Παραδοτέου «${input.title}» είναι έτοιμη για την Παραγωγή «${input.production}».`,
      `Version ${input.version} of the deliverable “${input.title}” for the production “${input.production}” is ready.`,
    ),
  ];
  const rounds = roundsText(input);
  if (rounds) paragraphs.push(rounds);
  return paragraphs;
}

export function deliverableVersionMessage(input: DeliverableVersionInput): EmailMessageBody {
  const { locale } = input;
  const subject = pick(locale, `Νέα Έκδοση για έγκριση · ${input.title}`, `New version for approval · ${input.title}`);
  const paragraphs = [pick(locale, `Γεια σου ${input.name},`, `Hello ${input.name},`), ...deliverableVersionDetails(input)];
  const rendered = renderShell({
    locale,
    origin: input.origin,
    heading: subject,
    paragraphs,
    action: {
      label: pick(locale, "Δες και απάντησε", "View and respond"),
      url: deliverableUrl(input.origin, input.deliverableId),
    },
  });
  return { subject, ...rendered };
}
