import { pick, type Locale } from "../locale";

import type { EmailMessageBody } from "./auth-messages";
import { renderShell } from "./shell";

// Μήνυμα «Καταχωρήθηκε Τιμολόγιο» (#152, Π7): προς κάθε Χρήστη πελάτη με «Βλέπει Οικονομικά». Το PDF επισυνάπτεται από τον worker.

export type InvoiceMessageKind = "invoice" | "receipt" | "credit";

export interface InvoiceRegisteredInput {
  locale: Locale;
  origin: string;
  name: string;
  kind: InvoiceMessageKind;
  number: string;
  issueDate: string;
  dueDate: string | null;
  total: number;
}

const FINANCE_PATH = "/app/finance/invoices";

const SUBJECTS: Readonly<Record<InvoiceMessageKind, { el: string; en: string }>> = {
  invoice: { el: "Νέο τιμολόγιο", en: "New invoice" },
  receipt: { el: "Νέα απόδειξη", en: "New receipt" },
  credit: { el: "Νέο πιστωτικό", en: "New credit note" },
};

const KIND_NOUN: Readonly<Record<InvoiceMessageKind, { el: string; en: string }>> = {
  invoice: { el: "Το τιμολόγιο", en: "The invoice" },
  receipt: { el: "Η απόδειξη", en: "The receipt" },
  credit: { el: "Το πιστωτικό", en: "The credit note" },
};

// Ημερομηνία YYYY-MM-DD ως ΗΗ/ΜΜ/ΕΕΕΕ, χωρίς ζώνη ώρας (είναι ημέρα, όχι στιγμή).
const formatDay = (isoDay: string): string => {
  const [year, month, day] = isoDay.split("-");
  return `${day}/${month}/${year}`;
};

const formatTotal = (locale: Locale, total: number): string =>
  new Intl.NumberFormat(locale === "en" ? "en-GB" : "el-GR", { style: "currency", currency: "EUR" }).format(total);

export function invoiceRegisteredMessage(input: InvoiceRegisteredInput): EmailMessageBody {
  const { locale } = input;
  const subject = `${pick(locale, SUBJECTS[input.kind].el, SUBJECTS[input.kind].en)} ${input.number}`;
  const paragraphs = [
    pick(locale, `Γεια σου ${input.name},`, `Hello ${input.name},`),
    pick(
      locale,
      `${KIND_NOUN[input.kind].el} ${input.number} καταχωρήθηκε. Το PDF επισυνάπτεται σε αυτό το μήνυμα.`,
      `${KIND_NOUN[input.kind].en} ${input.number} has been recorded. The PDF is attached to this message.`,
    ),
    pick(
      locale,
      `Ημερομηνία έκδοσης: ${formatDay(input.issueDate)}`,
      `Issue date: ${formatDay(input.issueDate)}`,
    ),
    pick(locale, `Ποσό: ${formatTotal(locale, input.total)}`, `Amount: ${formatTotal(locale, input.total)}`),
    ...(input.dueDate
      ? [pick(locale, `Λήξη: ${formatDay(input.dueDate)}`, `Due date: ${formatDay(input.dueDate)}`)]
      : []),
  ];
  const rendered = renderShell({
    locale,
    origin: input.origin,
    heading: subject,
    paragraphs,
    action: {
      label: pick(locale, "Δες τα Οικονομικά", "View your finances"),
      url: `${input.origin}${FINANCE_PATH}`,
    },
  });
  return { subject, ...rendered };
}
