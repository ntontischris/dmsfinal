import { describe, expect, test } from "vitest";

import type { InvoiceItem } from "../invoices-view-schema";
import { debtorsOf, matchesSearch } from "./i2-debtors";

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
  status: "overdue",
  creditForNumber: null,
  ...over,
});

describe("debtorsOf (Ποιος μας χρωστάει)", () => {
  const rows = [
    invoiceOf({ id: "a", remaining: 100, dueDate: "2026-09-20" }),
    invoiceOf({ id: "b", remaining: 50.5, dueDate: "2026-08-10" }),
    invoiceOf({ id: "c", clientId: "c2", clientName: "Αλφα", remaining: 400, dueDate: "2026-10-01" }),
    invoiceOf({ id: "d", clientId: "c3", status: "unpaid", remaining: 999 }),
  ];

  test("should group only overdue invoices by client, largest debt first", () => {
    expect(debtorsOf(rows)).toEqual([
      { clientId: "c2", clientName: "Αλφα", amount: 400, oldestDue: "2026-10-01", count: 1, invoiceId: "c" },
      { clientId: "c1", clientName: "Κύπρου", amount: 150.5, oldestDue: "2026-08-10", count: 2, invoiceId: "b" },
    ]);
  });

  test("should return nothing when nothing is overdue", () => {
    expect(debtorsOf([invoiceOf({ status: "paid", remaining: 0 })])).toEqual([]);
  });
});

describe("matchesSearch", () => {
  const row = invoiceOf({ number: "ΤΠΥ-0042", clientName: "Ζαχαροπλαστείο Ηλιάδη" });

  test("should match the invoice number or the client name, ignoring case and accents", () => {
    expect(matchesSearch(row, "0042")).toBe(true);
    expect(matchesSearch(row, "τπυ")).toBe(true);
    expect(matchesSearch(row, "ηλιαδη")).toBe(true);
    expect(matchesSearch(row, "ΖΑΧΑΡΟΠΛΑΣΤΕΙΟ")).toBe(true);
  });

  test("should keep every row for an empty search and drop the rest", () => {
    expect(matchesSearch(row, "  ")).toBe(true);
    expect(matchesSearch(row, "Κύπρου")).toBe(false);
  });
});
