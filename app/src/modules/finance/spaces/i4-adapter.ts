// I4 (νέα εμφάνιση): οι πραγματικές Εισπράξεις (receipts_view) στις γραμμές του πίνακα του prototype (`screens/I4.tsx`).
// Καθαρή συνάρτηση. Τα πεδία της διόρθωσης (ημερομηνία ISO, Τρόπος) μένουν για τη φόρμα της διόρθωσης.

import type { ReceiptRow } from "../types";

export interface I4Row {
  id: string;
  date: string;
  clientName: string;
  amount: number;
  method: string;
  methodId: string;
  note: string;
  by: string;
  // Τα Τιμολόγια που εξόφλησε (από το παλαιότερο)· null όταν δεν φόρτωσαν τα Τιμολόγια.
  invoices: readonly string[] | null;
  // Η διαγραφή μένει στο ίχνος: η γραμμή δείχνει τον λόγο αντί για ενέργειες.
  deletedReason: string | null;
  canEdit: boolean;
}

export const i4RowsOf = (
  receipts: readonly ReceiptRow[],
  targets: Readonly<Record<string, readonly string[]>> | null,
): I4Row[] =>
  receipts.map((r) => ({
    id: r.id,
    date: r.receivedOn,
    clientName: r.clientName,
    amount: r.amount,
    method: r.methodLabel,
    methodId: r.methodId,
    note: r.note,
    by: r.createdByName,
    invoices: targets === null ? null : (targets[r.id] ?? []),
    deletedReason: r.deleted ? (r.deleteReason ?? "") : null,
    canEdit: r.canEdit && !r.deleted,
  }));

// Η στήλη «Ενέργειες» φαίνεται όταν κάποια γραμμή διορθώνεται ή δείχνει λόγο διαγραφής.
export const hasActionsColumn = (rows: readonly I4Row[]): boolean =>
  rows.some((row) => row.canEdit || row.deletedReason !== null);
