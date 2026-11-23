// I5 (Χρήματα restyle): τα σύνολα της κεφαλίδας της Καρτέλας, από τις ίδιες κινήσεις που δείχνει η λίστα. Καθαρές συναρτήσεις.

import { fmtMoney } from "@/spaces/screens/shared";

import type { I5Row } from "./i5-adapter";

export interface LedgerTotals {
  debit: number;
  credit: number;
}

// Πόσα χρεώθηκαν και πόσα πιστώθηκαν σε όλο τον λογαριασμό (Τιμολόγια ↔ Εισπράξεις, πιστωτικά, παρακρατήσεις).
export const ledgerTotalsOf = (rows: readonly I5Row[]): LedgerTotals =>
  rows.reduce(
    (sum, row) => ({
      debit: sum.debit + row.debit,
      credit: sum.credit + row.credit,
    }),
    { debit: 0, credit: 0 },
  );

// Το πλακίδιο της γραμμής: το πρώτο γράμμα της κίνησης («Τιμολόγιο …» → «Τ»).
export const lineMarkOf = (label: string): string =>
  label.trim().charAt(0).toUpperCase() || "·";

// Η ετικέτα του μεγάλου αριθμού: προς τα πού είναι το υπόλοιπο, στη φωνή της ομάδας ή του πελάτη.
export const balanceLabelOf = (balance: number, isClient: boolean): string => {
  const inFavour = balance < 0;
  if (isClient)
    return inFavour
      ? "Υπόλοιπο υπέρ σου (με ΦΠΑ)"
      : "Χρωστάς από Τιμολόγια (με ΦΠΑ)";
  return inFavour
    ? "Υπόλοιπο υπέρ του πελάτη (με ΦΠΑ)"
    : "Χρωστά από Τιμολόγια (με ΦΠΑ)";
};

// Τα μικρά στοιχεία κάτω από το υπόλοιπο: σύνολα χρεώσεων/πιστώσεων και ληξιπρόθεσμο.
export const factsOf = (rows: readonly I5Row[], overdue: number): string => {
  const totals = ledgerTotalsOf(rows);
  return `χρεώσεις ${fmtMoney(totals.debit)} · πιστώσεις ${fmtMoney(totals.credit)} · ληξιπρόθεσμο ${fmtMoney(overdue)}`;
};
