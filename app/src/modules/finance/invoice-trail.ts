import { formatMoney } from "./billables-helpers";
import { trailText } from "./invoice-detail-helpers";
import type { InvoicePayment, TrailEntry } from "./invoice-detail-schema";
import type { Reminder } from "./invoice-reminder-schema";
import { athensToday, formatReceiptDate } from "./money";

// Τ4: το Ίχνος της σελίδας Τιμολογίου σε μία σειρά: καταχώριση/διορθώσεις, πληρωμές και υπενθυμίσεις, παλαιότερο πρώτα.

export interface TrailRow {
  id: string;
  at: string;
  title: string;
  meta: string;
}

// Ημερομηνία πληρωμής (ΕΕΕΕ-ΜΜ-ΗΗ) ή χρονοσφραγίδα: ταξινόμηση με τον ίδιο χρόνο, όχι με το κείμενο.
const timeOf = (at: string): number =>
  new Date(at.length === 10 ? `${at}T00:00:00` : at).getTime();

const dayOf = (at: string): string =>
  formatReceiptDate(at.length === 10 ? at : athensToday(new Date(at)));

const fromEntry = (entry: TrailEntry, index: number): TrailRow => ({
  id: `e-${index}`,
  at: entry.at,
  title: trailText(entry),
  meta: `${dayOf(entry.at)} · ${entry.byName ?? "—"}`,
});

const fromPayment = (payment: InvoicePayment): TrailRow => ({
  id: `p-${payment.receiptId}`,
  at: payment.receivedOn,
  title: `Ήρθε πληρωμή ${formatMoney(payment.applied)}`,
  meta: `${dayOf(payment.receivedOn)} · ${payment.methodLabel}`,
});

export const reminderTitle = (reminder: Reminder): string =>
  reminder.manual
    ? "Υπενθύμιση στον Πελάτη (με το χέρι)"
    : "Υπενθύμιση στον Πελάτη (αυτόματη)";

const fromReminder = (reminder: Reminder, index: number): TrailRow => ({
  id: `r-${index}`,
  at: reminder.at,
  title: reminderTitle(reminder),
  meta: `${dayOf(reminder.at)} · ${reminder.manual ? (reminder.byName ?? "—") : "αυτόματα"}`,
});

export const trailRowsOf = (
  entries: readonly TrailEntry[],
  payments: readonly InvoicePayment[],
  reminders: readonly Reminder[],
): TrailRow[] =>
  [
    ...entries.map(fromEntry),
    ...payments.map(fromPayment),
    ...reminders.map(fromReminder),
  ].sort((a, b) => timeOf(a.at) - timeOf(b.at));

// «Τελευταία υπενθύμιση 20/11/2026 (με το χέρι)», ή null όταν δεν έφυγε καμία. Η λίστα έρχεται νεότερη πρώτα.
export const lastReminderText = (reminders: readonly Reminder[]): string | null => {
  const last = reminders[0];
  if (!last) return null;
  return `Τελευταία υπενθύμιση ${dayOf(last.at)} (${last.manual ? "με το χέρι" : "αυτόματη"})`;
};
