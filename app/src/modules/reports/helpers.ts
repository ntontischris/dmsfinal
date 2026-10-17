import type { TurnoverMonth } from "./view-schema";

// Καθαρές συναρτήσεις των σωμάτων Αναφορών. Οι κρίσεις (Περίοδοι, κουτιά, ποσά) τις κάνει η βάση.

// Υπάρχει έστω μία κίνηση στην περίοδο; (με πλήθη, άρα δουλεύει και χωρίς ποσά)
export const hasMovement = (months: readonly TurnoverMonth[]): boolean =>
  months.some((m) => m.invoiceCount + m.creditCount + m.receiptCount > 0);

// Το μήκος μιας μπάρας, ως ποσοστό του μεγαλύτερου ποσού (αρνητικός Τζίρος = απόλυτη τιμή).
export const barPercent = (value: number, max: number): number =>
  max <= 0 ? 0 : Math.round((Math.abs(value) / max) * 1000) / 10;

export const maxAmount = (months: readonly TurnoverMonth[]): number =>
  Math.max(
    0,
    ...months.flatMap((m) => [
      Math.abs(m.turnover ?? 0),
      Math.abs(m.collections ?? 0),
    ]),
  );
