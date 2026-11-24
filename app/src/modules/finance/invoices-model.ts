import { formatMoney } from "./billables-helpers";
import type {
  InvoiceContext,
  InvoiceKind,
  OpenBillable,
} from "./invoices-view-schema";
import { decimalText, parseReceiptAmount } from "./money";

// Η φόρμα Καταχώρησης (I3) ως καθαρές συναρτήσεις: προσυμπλήρωση λήξης, προειδοποιήσεις (Π4), κάλυψη Τιμολογητέων.
// Καμία σταθερά ΦΠΑ ή ημερών: όλα έρχονται από το υπόδειγμα της βάσης (Π5).

export interface DraftForm {
  kind: InvoiceKind;
  number: string;
  issueDate: string;
  dueOverride: string | null;
  net: string;
  vat: string;
  total: string;
  mark: string;
  pdfTaxId: string;
  creditFor: string;
  taxIdConfirmed: boolean;
  // Όσο ο Χρήστης δεν έχει αγγίξει ΦΠΑ και σύνολο, αυτά ακολουθούν το καθαρό.
  autoAmounts: boolean;
}

export interface Warning {
  text: string;
  isStrong: boolean;
}

export const emptyDraft = (today: string): DraftForm => ({
  kind: "invoice",
  number: "",
  issueDate: today,
  dueOverride: null,
  net: "",
  vat: "",
  total: "",
  mark: "",
  pdfTaxId: "",
  creditFor: "",
  taxIdConfirmed: false,
  autoAmounts: true,
});

const EPSILON = 0.005;
const VAT_EPSILON = 0.015;
const round2 = (value: number): number => Math.round(value * 100) / 100;

// Ποσό από πεδίο κειμένου· κενό ή άκυρο = 0 (η υποβολή το ελέγχει χωριστά).
export const amountOf = (text: string): number => parseReceiptAmount(text) ?? 0;

export const addDays = (isoDay: string, days: number): string => {
  const date = new Date(`${isoDay}T00:00:00Z`);
  if (Number.isNaN(date.getTime())) return "";
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
};

export const dueOf = (form: DraftForm, paymentDays: number): string =>
  form.dueOverride ?? addDays(form.issueDate, paymentDays);

// Ο αναμενόμενος ΦΠΑ για ένα καθαρό, με τον συντελεστή της Συμφωνίας (ή της εταιρείας).
export const expectedVat = (net: number, vatRate: number): number =>
  round2((net * vatRate) / 100);

// Νέο καθαρό: με αυτόματα ποσά, ο ΦΠΑ και το σύνολο προσυμπληρώνονται με τον συντελεστή του υποδείγματος (Π5).
export const withNet = (form: DraftForm, net: string, vatRate: number): DraftForm => {
  if (!form.autoAmounts) return { ...form, net };
  const amount = amountOf(net);
  if (amount <= 0) return { ...form, net, vat: "", total: "" };
  const vat = expectedVat(amount, vatRate);
  return { ...form, net, vat: decimalText(vat), total: decimalText(round2(amount + vat)) };
};

const rateText = (rate: number): string => String(rate).replace(".", ",");

const diffText = (diff: number): string =>
  diff > 0
    ? `${formatMoney(diff)} περισσότερο`
    : `${formatMoney(-diff)} λιγότερο`;

export const hasTaxMismatch = (form: DraftForm, ctx: InvoiceContext): boolean =>
  ctx.clientTaxId !== null &&
  form.pdfTaxId.trim() !== "" &&
  form.pdfTaxId.trim() !== ctx.clientTaxId;

export function warningsOf(form: DraftForm, ctx: InvoiceContext): Warning[] {
  const net = amountOf(form.net);
  const vat = amountOf(form.vat);
  const total = amountOf(form.total);
  const warnings: Warning[] = [];
  const add = (text: string, isStrong = false) =>
    warnings.push({ text, isStrong });
  if (Math.abs(net + vat - total) > EPSILON)
    add("Το καθαρό + ΦΠΑ δεν βγάζει το σύνολο.");
  if (net > 0 && Math.abs(vat - (net * ctx.vatRate) / 100) > VAT_EPSILON)
    add(`Το ΦΠΑ δεν είναι ${rateText(ctx.vatRate)}% του καθαρού.`);
  if (
    form.kind !== "credit" &&
    net > 0 &&
    Math.abs(net - ctx.toInvoice) > EPSILON
  )
    add(
      `Το καθαρό είναι ${diffText(net - ctx.toInvoice)} από το «Προς τιμολόγηση» του Πελάτη (${formatMoney(ctx.toInvoice)}).`,
    );
  if (hasTaxMismatch(form, ctx))
    add(
      `Το ΑΦΜ στο PDF (${form.pdfTaxId.trim()}) διαφέρει από το ΑΦΜ του Πελάτη (${ctx.clientTaxId}).`,
      true,
    );
  if (form.number.trim() && ctx.existingNumbers.includes(form.number.trim()))
    add(
      `Ο αριθμός ${form.number.trim()} υπάρχει ήδη για αυτόν τον Πελάτη (πιθανό διπλό).`,
    );
  return warnings;
}

// Τι λείπει ακόμα για την καταχώριση, με τις λέξεις της φόρμας (φαίνεται κάτω από το κουμπί).
export const missingOf = (form: DraftForm, ctx: InvoiceContext, hasFile: boolean): string[] =>
  [
    hasFile ? null : "PDF",
    form.number.trim() === "" ? "Αριθμός" : null,
    form.issueDate === "" ? "Ημερομηνία έκδοσης" : null,
    amountOf(form.total) > 0 ? null : form.autoAmounts ? "Καθαρό ποσό" : "Σύνολο",
    form.kind === "credit" && form.creditFor === "" ? "Ποιο Τιμολόγιο διορθώνει" : null,
    hasTaxMismatch(form, ctx) && !form.taxIdConfirmed ? "Επιβεβαίωση ΑΦΜ" : null,
  ].filter((part): part is string => part !== null);

export const canSubmit = (form: DraftForm, ctx: InvoiceContext, hasFile: boolean): boolean =>
  missingOf(form, ctx, hasFile).length === 0;

// Ο επόμενος αριθμός μιας σειράς: ο τελευταίος καταχωρισμένος με το τελικό του νούμερο +1, με τα ίδια μηδενικά
// μπροστά (DEMO-017 → DEMO-018, Α-99 → Α-100). Χωρίς νούμερο στο τέλος δεν μαντεύουμε: κενό.
export const nextNumberOf = (last: string): string => {
  const match = /^(.*?)(\d+)(\D*)$/.exec(last.trim());
  if (!match) return "";
  const [, head, digits, tail] = match;
  const next = String(BigInt(digits) + 1n).padStart(digits.length, "0");
  return `${head}${next}${tail}`;
};

export type NumberSuggestions = Partial<Record<InvoiceKind, string>>;

// Η πρόταση αριθμού ανά είδος, από τα Τιμολόγια της εταιρείας (το πρώτο ανά είδος είναι το πιο πρόσφατο).
export const numberSuggestionsOf = (
  latestFirst: readonly { kind: InvoiceKind; number: string }[],
): NumberSuggestions =>
  latestFirst.reduce<NumberSuggestions>((acc, item) => {
    if (acc[item.kind] !== undefined) return acc;
    const next = nextNumberOf(item.number);
    return next === "" ? acc : { ...acc, [item.kind]: next };
  }, {});

// Αλλαγή είδους: ο προτεινόμενος αριθμός ακολουθεί το είδος, όσο ο Χρήστης δεν έχει γράψει δικό του.
export const withKind = (form: DraftForm, kind: InvoiceKind, suggestions: NumberSuggestions): DraftForm => {
  const number = form.number.trim();
  const isSuggested = number === "" || number === suggestions[form.kind];
  return isSuggested ? { ...form, kind, number: suggestions[kind] ?? "" } : { ...form, kind };
};

// Η πρώτη εικόνα της φόρμας: ο επόμενος αριθμός και το «Προς τιμολόγηση» του Πελάτη ως καθαρό (με ΦΠΑ και σύνολο).
export const startDraft = (today: string, ctx: InvoiceContext, suggestions: NumberSuggestions): DraftForm => {
  const empty = { ...emptyDraft(today), number: suggestions.invoice ?? "" };
  return ctx.toInvoice > 0 ? withNet(empty, decimalText(ctx.toInvoice), ctx.vatRate) : empty;
};

export interface CoverageRow {
  billable: OpenBillable;
  covered: number;
  left: number;
}

// Τα καθαρά της φόρμας καλύπτουν από το παλαιότερο Τιμολογητέο. Τα πιστωτικά δεν ξανανοίγουν τίποτα.
export const coverageOf = (
  open: readonly OpenBillable[],
  net: number,
): { rows: CoverageRow[]; beyond: number } => {
  const result = open.reduce<{ left: number; rows: CoverageRow[] }>(
    (acc, billable) => {
      const covered = round2(Math.min(billable.open, acc.left));
      return {
        left: round2(acc.left - covered),
        rows: [
          ...acc.rows,
          { billable, covered, left: round2(billable.open - covered) },
        ],
      };
    },
    { left: net, rows: [] },
  );
  return { rows: result.rows, beyond: result.left };
};

export const coverageText = (row: CoverageRow): string => {
  if (row.covered === 0) return "μένει ανοιχτό";
  if (row.left === 0) return "καλύπτεται πλήρως";
  return `καλύπτεται ${formatMoney(row.covered)}, μένει ${formatMoney(row.left)}`;
};
