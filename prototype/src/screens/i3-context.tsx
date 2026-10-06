import { agreementsOfClient, findAgreement } from "@/data/agreements";
import { INVOICES, type Invoice } from "@/data/finance";
import {
  liveInvoices,
  openBillables,
  toInvoiceOf,
} from "@/data/finance-access";
import { findClient } from "@/data/sales";
import type { CorrectInvoice } from "@/screens/i3-correct";
import type { I3Context } from "@/screens/i3-model";

const DEFAULT_PAYMENT_DAYS = 15;

// Μέρες πληρωμής: Όροι της Συμφωνίας του παλαιότερου ανοιχτού Τιμολογητέου, αλλιώς της ενεργής Συμφωνίας του Πελάτη.
const paymentDaysOf = (clientId: string): number => {
  const oldest = openBillables(clientId)[0];
  const agreement =
    findAgreement(oldest?.billable.agreementId) ??
    agreementsOfClient(clientId).find((a) => a.state === "ενεργή");
  return agreement?.terms.paymentDays ?? DEFAULT_PAYMENT_DAYS;
};

export const contextOf = (clientId: string): I3Context | null => {
  const client = findClient(clientId);
  if (!client) return null;
  return {
    clientId,
    clientName: client.name,
    clientVat: client.vat,
    paymentDays: paymentDaysOf(clientId),
    toInvoice: toInvoiceOf(clientId),
    open: openBillables(clientId).map((row) => ({
      id: row.billable.id,
      label: row.billable.label,
      date: row.billable.date,
      open: row.open,
    })),
    invoices: liveInvoices(clientId)
      .filter((i) => i.kind !== "πιστωτικό")
      .map((i) => ({ id: i.id, number: i.number, kind: i.kind })),
    existingNumbers: liveInvoices(clientId).map((i) => i.number),
    recipients: client.users.map((u) => ({ name: u.name, email: u.email })),
  };
};

export const correctionOf = (invoice: Invoice): CorrectInvoice => ({
  number: invoice.number,
  issueDate: invoice.issueDate,
  dueDate: invoice.dueDate ?? "",
  net: String(invoice.net),
  vat: String(invoice.vat),
  mark: invoice.mark ?? "",
});

export const invoiceById = (id: string | undefined): Invoice | undefined =>
  INVOICES.find((i) => i.id === id);
