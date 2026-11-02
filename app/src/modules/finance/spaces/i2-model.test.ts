import { describe, expect, test } from "vitest";

import type { InvoiceItem } from "../invoices-view-schema";
import type { ReceiptRow } from "../types";
import {
  byClient,
  byMonth,
  clientsWithInvoices,
  dueNoteOf,
  fmtMonth,
  invoiceMonthsOf,
  monthName,
  previousMonthOf,
  receiptsIn,
  unpaidNoteOf,
  visibleInvoices,
} from "./i2-model";

const invoiceOf = (over: Partial<InvoiceItem> = {}): InvoiceItem => ({
  id: "i1",
  number: "Α-1",
  kind: "invoice",
  clientId: "c1",
  clientName: "Κύπρου",
  issueDate: "2026-09-01",
  dueDate: "2026-09-20",
  total: 124,
  paid: 0,
  remaining: 124,
  status: "unpaid",
  creditForNumber: null,
  ...over,
});

const receiptOf = (over: Partial<ReceiptRow> = {}): ReceiptRow => ({
  id: "r1",
  clientId: "c1",
  clientName: "Κύπρου",
  receivedOn: "2026-09-10",
  amount: 100,
  methodId: "m1",
  methodLabel: "Μεταφορά",
  note: "",
  createdByName: "Μαρία",
  deleted: false,
  deleteReason: null,
  canEdit: true,
  ...over,
});

describe("φίλτρα Τιμολογίων (ίδιοι κανόνες με το invoices_view)", () => {
  const rows = [
    invoiceOf({ id: "a", issueDate: "2026-08-01" }),
    invoiceOf({ id: "b", status: "overdue", issueDate: "2026-09-02" }),
    invoiceOf({ id: "c", status: "paid", remaining: 0, paid: 124 }),
    invoiceOf({ id: "d", kind: "credit", status: "credit", remaining: 50 }),
  ];

  test("ανεξόφλητα: ό,τι χρωστιέται, χωρίς τα πιστωτικά", () => {
    expect(visibleInvoices(rows, "unpaid").map((r) => r.id)).toEqual([
      "b",
      "a",
    ]);
  });

  test("ληξιπρόθεσμα και πιστωτικά", () => {
    expect(visibleInvoices(rows, "overdue").map((r) => r.id)).toEqual(["b"]);
    expect(visibleInvoices(rows, "credit").map((r) => r.id)).toEqual(["d"]);
  });

  test("όλα, νεότερο πρώτο", () => {
    expect(visibleInvoices(rows, "all")[0].id).toBe("b");
  });

  test("μήνας και Πελάτης στενεύουν τις γραμμές", () => {
    expect(invoiceMonthsOf(rows)).toEqual(["2026-09", "2026-08"]);
    expect(byMonth(rows, "2026-08").map((r) => r.id)).toEqual(["a"]);
    expect(byClient(rows, "c2")).toEqual([]);
    expect(byClient(rows, undefined)).toHaveLength(4);
  });
});

test("ο Πελάτης στο φίλτρο εμφανίζεται μία φορά", () => {
  expect(
    clientsWithInvoices([
      invoiceOf(),
      invoiceOf({ id: "x" }),
      invoiceOf({ clientId: "c2", clientName: "Άλφα" }),
    ]),
  ).toEqual([
    { id: "c2", name: "Άλφα" },
    { id: "c1", name: "Κύπρου" },
  ]);
});

test("η σημείωση εξηγεί τη διαφορά ανεξόφλητων και ληξιπρόθεσμων", () => {
  expect(unpaidNoteOf([invoiceOf(), invoiceOf({ status: "overdue" })])).toBe(
    "Από τα 2 ανεξόφλητα, 1 έχει λήξει (ληξιπρόθεσμο)· το άλλο δεν έχει λήξει ακόμα.",
  );
  expect(unpaidNoteOf([invoiceOf()])).toBe(
    "Από το 1 ανεξόφλητο, κανένα δεν έχει λήξει.",
  );
  expect(unpaidNoteOf([invoiceOf({ remaining: 0 })])).toBeNull();
});

test("πότε λήγει ή πόσο καθυστερεί", () => {
  expect(dueNoteOf(invoiceOf(), "2026-10-22")).toBe("καθυστερεί 32 μέρες");
  expect(dueNoteOf(invoiceOf(), "2026-09-21")).toBe("καθυστερεί 1 μέρα");
  expect(dueNoteOf(invoiceOf(), "2026-09-17")).toBe("λήγει σε 3 μέρες");
  expect(dueNoteOf(invoiceOf(), "2026-09-19")).toBe("λήγει αύριο");
  expect(dueNoteOf(invoiceOf(), "2026-09-20")).toBe("λήγει σήμερα");
  expect(dueNoteOf(invoiceOf({ remaining: 0 }), "2026-09-20")).toBeNull();
  expect(dueNoteOf(invoiceOf({ dueDate: null }), "2026-09-20")).toBeNull();
});

test("μήνες και Εισπράξεις του μήνα", () => {
  expect(fmtMonth("2026-09")).toBe("Σεπτέμβριος 2026");
  expect(monthName("2026-09")).toBe("Σεπτέμβριο");
  expect(previousMonthOf("2026-01")).toBe("2025-12");
  const receipts = [
    receiptOf(),
    receiptOf({ id: "r2", amount: 20.5 }),
    receiptOf({ id: "r3", deleted: true }),
    receiptOf({ id: "r4", receivedOn: "2026-08-30" }),
  ];
  expect(receiptsIn(receipts, "2026-09")).toBe(120.5);
  expect(receiptsIn(receipts, "2026-08")).toBe(100);
});
