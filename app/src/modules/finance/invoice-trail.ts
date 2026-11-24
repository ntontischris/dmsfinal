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

const dayOf = (at: string): string =>
  formatReceiptDate(at.length === 10 ? at : athensToday(new Date(at)));

const fromEntry = (entry: TrailEntry): TrailRow => ({
  id: `e-${entry.at}-${entry.action}`,
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

const fromReminder = (reminder: Reminder): TrailRow => ({
  id: `r-${reminder.at}`,
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
  ].sort((a, b) => a.at.localeCompare(b.at));

// «Τελευταία υπενθύμιση 20/11/2026 (με το χέρι)», ή null όταν δεν έφυγε καμία. Η λίστα έρχεται νεότερη πρώτα.
export const lastReminderText = (reminders: readonly Reminder[]): string | null => {
  const last = reminders[0];
  if (!last) return null;
  return `Τελευταία υπενθύμιση ${dayOf(last.at)} (${last.manual ? "με το χέρι" : "αυτόματη"})`;
};
