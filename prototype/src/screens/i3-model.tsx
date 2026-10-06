import type { InvoiceKind } from "@/data/finance";
import { TODAY } from "@/data/finance-access";
import { fmtMoney } from "@/screens/shared";

export interface BillableLite {
  id: string;
  label: string;
  date: string;
  open: number;
}

export interface InvoiceOption {
  id: string;
  number: string;
  kind: string;
}

export interface Recipient {
  name: string;
  email: string;
}

export interface I3Context {
  clientId: string;
  clientName: string;
  clientVat: string;
  paymentDays: number;
  toInvoice: number;
  open: readonly BillableLite[];
  invoices: readonly InvoiceOption[];
  existingNumbers: readonly string[];
  recipients: readonly Recipient[];
}

export interface FormState {
  kind: InvoiceKind;
  number: string;
  issueDate: string;
  dueOverride: string | null;
  net: string;
  vat: string;
  total: string;
  mark: string;
  pdfVat: string;
  creditFor: string;
  vatConfirmed: boolean;
}

export const EMPTY_FORM: FormState = {
  kind: "τιμολόγιο",
  number: "",
  issueDate: TODAY,
  dueOverride: null,
  net: "",
  vat: "",
  total: "",
  mark: "",
  pdfVat: "",
  creditFor: "",
  vatConfirmed: false,
};

export const num = (text: string): number =>
  Number(text.replace(",", ".")) || 0;

const r2 = (value: number): number => Math.round(value * 100) / 100;

export const addDays = (iso: string, days: number): string => {
  const date = new Date(`${iso}T00:00:00Z`);
  if (Number.isNaN(date.getTime())) return "";
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
};

export const dueOf = (form: FormState, days: number): string =>
  form.dueOverride ?? addDays(form.issueDate, days);

// Τιμές που «διάβασε το AI» από το PDF (προσομοίωση).
export const readPdf = (ctx: I3Context): FormState => {
  const net = ctx.toInvoice;
  const vat = r2(net * 0.24);
  return {
    ...EMPTY_FORM,
    number: "Α-77",
    net: String(net),
    vat: String(vat),
    total: String(r2(net + vat)),
    pdfVat: ctx.clientVat,
  };
};

export interface Warning {
  text: string;
  isStrong: boolean;
}

const diffText = (diff: number): string =>
  diff > 0 ? `${fmtMoney(diff)} περισσότερο` : `${fmtMoney(-diff)} λιγότερο`;

export const warningsOf = (form: FormState, ctx: I3Context): Warning[] => {
  const net = num(form.net);
  const vat = num(form.vat);
  const total = num(form.total);
  const isCredit = form.kind === "πιστωτικό";
  const list: Warning[] = [];
  const add = (text: string, isStrong = false) => list.push({ text, isStrong });
  if (Math.abs(net + vat - total) > 0.005)
    add("Το καθαρό + ΦΠΑ δεν βγάζει το σύνολο.");
  if (Math.abs(vat - net * 0.24) > 0.015)
    add("Το ΦΠΑ δεν είναι 24% του καθαρού.");
  if (!isCredit && net > 0 && Math.abs(net - ctx.toInvoice) > 0.005)
    add(
      `Το καθαρό είναι ${diffText(net - ctx.toInvoice)} από το «Προς τιμολόγηση» του Πελάτη (${fmtMoney(ctx.toInvoice)}).`,
    );
  if (form.pdfVat && form.pdfVat.trim() !== ctx.clientVat)
    add(
      `Το ΑΦΜ στο PDF (${form.pdfVat}) διαφέρει από το ΑΦΜ του Πελάτη (${ctx.clientVat}).`,
      true,
    );
  if (form.number && ctx.existingNumbers.includes(form.number.trim()))
    add(
      `Ο αριθμός ${form.number} υπάρχει ήδη για αυτόν τον Πελάτη (πιθανό διπλό).`,
    );
  return list;
};

export const hasVatMismatch = (form: FormState, ctx: I3Context): boolean =>
  !!form.pdfVat && form.pdfVat.trim() !== ctx.clientVat;

export const canSubmit = (form: FormState, ctx: I3Context): boolean =>
  form.number.trim() !== "" &&
  form.issueDate !== "" &&
  num(form.total) > 0 &&
  (form.kind !== "πιστωτικό" || form.creditFor !== "") &&
  (!hasVatMismatch(form, ctx) || form.vatConfirmed);

export interface PreviewRow {
  billable: BillableLite;
  covered: number;
  left: number;
}

// Τα καθαρά της φόρμας καλύπτουν από το παλαιότερο Τιμολογητέο. Τα πιστωτικά δεν ξανανοίγουν τίποτα.
export const previewOf = (open: readonly BillableLite[], net: number) =>
  open.reduce<{ left: number; rows: PreviewRow[] }>(
    (acc, billable) => {
      const covered = r2(Math.min(billable.open, acc.left));
      return {
        left: r2(acc.left - covered),
        rows: [
          ...acc.rows,
          { billable, covered, left: r2(billable.open - covered) },
        ],
      };
    },
    { left: net, rows: [] },
  );
