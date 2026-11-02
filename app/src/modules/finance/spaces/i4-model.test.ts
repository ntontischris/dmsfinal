import { describe, expect, it } from "vitest";

import type { InvoiceItem } from "../invoices-view-schema";
import type { ReceiptRow } from "../types";
import {
  openInvoicesByClient,
  previewOf,
  receiptTargets,
  settlementOf,
} from "./i4-model";

const invoice = (overrides: Partial<InvoiceItem> = {}): InvoiceItem => ({
  id: "i-1",
  number: "Α-41",
  kind: "invoice",
  clientId: "kyp",
  clientName: "Κυψέλη Καφέ",
  issueDate: "2026-08-01",
  dueDate: "2026-08-31",
  total: 500,
  paid: 500,
  remaining: 0,
  status: "paid",
  creditForNumber: null,
  ...overrides,
});

const receipt = (overrides: Partial<ReceiptRow> = {}): ReceiptRow => ({
  id: "r-kyp-1",
  clientId: "kyp",
  clientName: "Κυψέλη Καφέ",
  receivedOn: "2026-08-20",
  amount: 500,
  methodId: "m-1",
  methodLabel: "Τραπεζική μεταφορά",
  note: "",
  createdByName: "Ελένη Ρήγα",
  deleted: false,
  deleteReason: null,
  canEdit: true,
  ...overrides,
});

// Όπως τα δίνει το invoices_view: νεότερο πρώτα.
const ITEMS: readonly InvoiceItem[] = [
  invoice({
    id: "i-3",
    number: "Α-62",
    issueDate: "2026-10-01",
    total: 1116,
    paid: 0,
    remaining: 1116,
    status: "unpaid",
  }),
  invoice({
    id: "i-c",
    number: "Π-1",
    kind: "credit",
    issueDate: "2026-09-15",
    total: 100,
    paid: 0,
    remaining: 0,
    status: "credit",
  }),
  invoice({
    id: "i-2",
    number: "Α-58",
    issueDate: "2026-09-01",
    total: 716,
    paid: 600,
    remaining: 16,
    status: "partial",
  }),
  invoice(),
];

describe("i4-model", () => {
  it("μετά την Είσπραξη λέει ποιο Τιμολόγιο εξοφλήθηκε και τι μένει", () => {
    const open = [
      { number: "Α-58", remaining: 616 },
      { number: "Α-62", remaining: 1116 },
    ];
    expect(settlementOf(open, 800)).toEqual([
      { number: "Α-58", isPaid: true, left: 0 },
      { number: "Α-62", isPaid: false, left: 932 },
    ]);
  });

  it("κάθε Είσπραξη δείχνει σε ποιο Τιμολόγιο πήγε", () => {
    const targets = receiptTargets(
      [
        receipt({ id: "r-kyp-2", receivedOn: "2026-09-20", amount: 600 }),
        receipt(),
      ],
      ITEMS,
    );
    expect(targets["r-kyp-1"]).toEqual(["Α-41"]);
    expect(targets["r-kyp-2"]).toEqual(["Α-58"]);
  });

  it("η διαγραμμένη Είσπραξη δεν μετρά", () => {
    const targets = receiptTargets(
      [
        receipt({ id: "r-del", deleted: true, receivedOn: "2026-08-01" }),
        receipt(),
      ],
      ITEMS,
    );
    expect(targets["r-del"]).toBeUndefined();
    expect(targets["r-kyp-1"]).toEqual(["Α-41"]);
  });

  it("τα ανοιχτά Τιμολόγια ανά Πελάτη είναι από το παλαιότερο, χωρίς πιστωτικά", () => {
    expect(openInvoicesByClient(ITEMS)).toEqual({
      kyp: [
        { number: "Α-58", remaining: 16 },
        { number: "Α-62", remaining: 1116 },
      ],
    });
  });

  it("η προεπισκόπηση κρατά το περίσσευμα υπέρ του πελάτη", () => {
    expect(previewOf([{ number: "Α-58", remaining: 16 }], 20)).toEqual({
      covers: [{ number: "Α-58", amount: 16 }],
      surplus: 4,
    });
  });
});
