import { describe, expect, it } from "vitest";

import type { InvoiceItem } from "../invoices-view-schema";
import type { LedgerEntry } from "../ledger-view-schema";
import { i5ClientIdOf, i5RowsOf } from "./i5-adapter";

const entry = (overrides: Partial<LedgerEntry> = {}): LedgerEntry => ({
  date: "2026-09-01",
  kind: "invoice",
  label: "Τιμολόγιο Α-58",
  debit: 716,
  credit: 0,
  running: 716,
  ...overrides,
});

const invoice = (overrides: Partial<InvoiceItem> = {}): InvoiceItem => ({
  id: "i-58",
  number: "Α-58",
  kind: "invoice",
  clientId: "kyp",
  clientName: "Κυψέλη Καφέ",
  issueDate: "2026-09-01",
  dueDate: "2026-10-01",
  total: 716,
  paid: 600,
  remaining: 116,
  status: "partial",
  creditForNumber: null,
  ...overrides,
});

describe("i5RowsOf", () => {
  it("το Τιμολόγιο της Καρτέλας παίρνει την κατάστασή του και πόσα μένουν από αυτό", () => {
    const [row] = i5RowsOf([entry()], "kyp", [invoice()]);
    expect(row).toMatchObject({
      date: "2026-09-01",
      label: "Τιμολόγιο Α-58",
      debit: 716,
      credit: 0,
      balance: 716,
      invoiceStatus: "μερικώς εξοφλημένο",
      invoiceRemaining: 116,
    });
  });

  it("η Απόδειξη βρίσκεται με τη δική της ετικέτα· Είσπραξη και πιστωτικό μένουν χωρίς κατάσταση", () => {
    const rows = i5RowsOf(
      [
        entry({ kind: "receipt_doc", label: "Απόδειξη Β-3" }),
        entry({
          kind: "payment",
          label: "Είσπραξη",
          debit: 0,
          credit: 600,
          running: 116,
        }),
        entry({
          kind: "credit",
          label: "Πιστωτικό Π-1",
          debit: 0,
          credit: 16,
          running: 100,
        }),
      ],
      "kyp",
      [
        invoice({
          id: "b-3",
          number: "Β-3",
          kind: "receipt",
          status: "paid",
          remaining: 0,
        }),
        invoice({ id: "p-1", number: "Π-1", kind: "credit", status: "credit" }),
      ],
    );
    expect(rows[0].invoiceStatus).toBe("εξοφλημένο");
    expect(rows[1].invoiceStatus).toBeUndefined();
    expect(rows[2].invoiceStatus).toBeUndefined();
  });

  it("δεν μπερδεύει Τιμολόγιο άλλου Πελάτη ούτε σπάει όταν δεν φόρτωσαν τα Τιμολόγια", () => {
    expect(
      i5RowsOf([entry()], "kyp", [invoice({ clientId: "other" })])[0]
        .invoiceStatus,
    ).toBeUndefined();
    expect(i5RowsOf([entry()], "kyp", null)[0].invoiceStatus).toBeUndefined();
  });

  it("δίνει μοναδικό κλειδί και σε ίδιες κινήσεις της ίδιας μέρας", () => {
    const payment = entry({ kind: "payment", label: "Είσπραξη" });
    const [a, b] = i5RowsOf([payment, payment], "kyp", []);
    expect(a.key).not.toBe(b.key);
  });
});

describe("i5ClientIdOf", () => {
  const clients = [
    { id: "kyp", name: "Κυψέλη Καφέ", balance: 100 },
    { id: "bak", name: "Φούρνος", balance: 0 },
  ];
  it("ο ?client= κερδίζει, αλλιώς ο πρώτος Πελάτης", () => {
    expect(i5ClientIdOf("bak", clients)).toBe("bak");
    expect(i5ClientIdOf(undefined, clients)).toBe("kyp");
    expect(i5ClientIdOf(undefined, [])).toBeUndefined();
  });
});
