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

export const canSubmit = (
  form: DraftForm,
  ctx: InvoiceContext,
  hasFile: boolean,
): boolean =>
  hasFile &&
  form.number.trim() !== "" &&
  form.issueDate !== "" &&
  amountOf(form.total) > 0 &&
  (form.kind !== "credit" || form.creditFor !== "") &&
  (!hasTaxMismatch(form, ctx) || form.taxIdConfirmed);

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
