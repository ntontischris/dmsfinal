import { pick, type Locale } from "../locale";

import type { EmailMessageBody } from "./auth-messages";
import { renderShell } from "./shell";

// Μηνύματα ολοκλήρωσης Παραγωγής (#143): «Παραδόθηκε» και «Περιμένει την απάντησή σου» (υπενθύμιση).

export interface DeliveredItem {
  title: string;
  url: string | null;
}

export interface ProductionDeliveredInput {
  locale: Locale;
  origin: string;
  name: string;
  productionId: string;
  productionTitle: string;
  deliverables: readonly DeliveredItem[];
}

export interface DeliverableReminderInput {
  locale: Locale;
  origin: string;
  name: string;
  deliverableId: string;
  title: string;
  production: string;
  version: number;
  days: number;
}

const productionUrl = (origin: string, productionId: string): string =>
  `${origin}/app/productions/${encodeURIComponent(productionId)}`;

const deliverableUrl = (origin: string, deliverableId: string): string =>
  `${origin}/app/deliverables/${encodeURIComponent(deliverableId)}`;

const deliveredItemText = (item: DeliveredItem): string =>
  item.url ? `${item.title}: ${item.url}` : item.title;

export function productionDeliveredMessage(
  input: ProductionDeliveredInput,
): EmailMessageBody {
  const { locale } = input;
  const subject = pick(
    locale,
    `Παραδόθηκε: ${input.productionTitle}`,
    `Delivered: ${input.productionTitle}`,
  );
  const paragraphs = [
    pick(locale, `Γεια σου ${input.name},`, `Hello ${input.name},`),
    pick(
      locale,
      `Η Παραγωγή «${input.productionTitle}» παραδόθηκε. Τα Παραδοτέα της:`,
      `The production “${input.productionTitle}” has been delivered. Its deliverables:`,
    ),
    ...input.deliverables.map(deliveredItemText),
  ];
  const rendered = renderShell({
    locale,
    origin: input.origin,
    heading: subject,
    paragraphs,
    action: {
      label: pick(locale, "Δες την Παραγωγή", "View the production"),
      url: productionUrl(input.origin, input.productionId),
    },
  });
  return { subject, ...rendered };
}

export function deliverableReminderMessage(
  input: DeliverableReminderInput,
): EmailMessageBody {
  const { locale } = input;
  const subject = pick(
    locale,
    `Περιμένει την απάντησή σου: ${input.title}`,
    `Waiting for your answer: ${input.title}`,
  );
  const paragraphs = [
    pick(locale, `Γεια σου ${input.name},`, `Hello ${input.name},`),
    pick(
      locale,
      `Η Έκδοση ${input.version} του Παραδοτέου «${input.title}» για την Παραγωγή «${input.production}» περιμένει την απάντησή σου.`,
      `Version ${input.version} of the deliverable “${input.title}” for the production “${input.production}” is waiting for your answer.`,
    ),
    pick(
      locale,
      `Έχουν περάσει ${input.days} μέρες από την αποστολή της.`,
      `It was sent ${input.days} days ago.`,
    ),
  ];
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
