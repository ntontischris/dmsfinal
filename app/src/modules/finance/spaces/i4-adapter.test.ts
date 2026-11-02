import { describe, expect, it } from "vitest";

import type { ReceiptRow } from "../types";
import { hasActionsColumn, i4RowsOf } from "./i4-adapter";

const receipt = (overrides: Partial<ReceiptRow> = {}): ReceiptRow => ({
  id: "r-1",
  clientId: "kyp",
  clientName: "Κυψέλη Καφέ",
  receivedOn: "2026-10-20",
  amount: 616,
  methodId: "m-1",
  methodLabel: "Τραπεζική μεταφορά",
  note: "Σεπτέμβριος",
  createdByName: "Ελένη Ρήγα",
  deleted: false,
  deleteReason: null,
  canEdit: true,
  ...overrides,
});

describe("i4RowsOf", () => {
  it("φέρνει την Είσπραξη στη μορφή της γραμμής του prototype, με τα Τιμολόγια της", () => {
    expect(i4RowsOf([receipt()], { "r-1": ["Α-58"] })).toEqual([
      {
        id: "r-1",
        date: "2026-10-20",
        clientName: "Κυψέλη Καφέ",
        amount: 616,
        method: "Τραπεζική μεταφορά",
        methodId: "m-1",
        note: "Σεπτέμβριος",
        by: "Ελένη Ρήγα",
        invoices: ["Α-58"],
        deletedReason: null,
        canEdit: true,
      },
    ]);
  });

  it("χωρίς Τιμολόγιο η Είσπραξη είναι υπόλοιπο υπέρ του πελάτη· χωρίς Τιμολόγια φορτωμένα, άγνωστο", () => {
    expect(i4RowsOf([receipt()], {})[0].invoices).toEqual([]);
    expect(i4RowsOf([receipt()], null)[0].invoices).toBeNull();
  });

  it("η διαγραμμένη δείχνει τον λόγο και δεν διορθώνεται", () => {
    const [row] = i4RowsOf(
      [receipt({ deleted: true, deleteReason: "Διπλή καταχώρηση" })],
      {},
    );
    expect(row.deletedReason).toBe("Διπλή καταχώρηση");
    expect(row.canEdit).toBe(false);
    expect(hasActionsColumn([row])).toBe(true);
  });

  it("χωρίς δικαίωμα διόρθωσης και χωρίς διαγραμμένες, δεν υπάρχει στήλη Ενεργειών", () => {
    expect(hasActionsColumn(i4RowsOf([receipt({ canEdit: false })], {}))).toBe(
      false,
    );
  });
});
