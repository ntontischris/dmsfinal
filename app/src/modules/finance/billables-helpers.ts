import { REASON_LABELS } from "./billables-labels";
import type { BillableClient, BillableItem } from "./billables-view-schema";

// Μορφοποίηση και ταξινόμηση του «Προς τιμολόγηση», καθαρές συναρτήσεις. Οι κρίσεις (ανοιχτό, μέρες) τις κάνει η βάση.

const MONEY = new Intl.NumberFormat("el-GR", {
  style: "currency",
  currency: "EUR",
});

export const formatMoney = (amount: number): string => MONEY.format(amount);

export const daysText = (days: number): string =>
  days === 1 ? "1 μέρα" : `${days} μέρες`;

// Σήμα υπενθύμισης: «7 μ.» και «14 μ.», μόνο για ό,τι έχει ήδη περάσει.
export const reminderText = (day: number): string => `${day} μ.`;

export const reasonText = (reason: string): string =>
  REASON_LABELS[reason] ?? reason;

// Πελάτες: οι παλαιότεροι ανοιχτοί πρώτα, ίσες μέρες με το όνομα. Γραμμές: κατά ημερομηνία.
export const sortClientsByOldest = (
  clients: readonly BillableClient[],
): BillableClient[] =>
  [...clients].sort(
    (a, b) =>
      b.oldestDays - a.oldestDays ||
      a.clientName.localeCompare(b.clientName, "el"),
  );

export const sortItemsByDate = (
  items: readonly BillableItem[],
): BillableItem[] =>
  [...items].sort(
    (a, b) =>
      a.billableOn.localeCompare(b.billableOn) || a.id.localeCompare(b.id),
  );

// Ημερομηνία της γραμμής (ημέρα, χωρίς ζώνη): η UTC μεσάνυχτα κρατά την ίδια μέρα σε κάθε περιβάλλον.
const DATE = new Intl.DateTimeFormat("el-GR", { timeZone: "UTC", day: "numeric", month: "short", year: "numeric" });

export const formatBillableDate = (isoDay: string): string => DATE.format(new Date(`${isoDay}T00:00:00Z`));
