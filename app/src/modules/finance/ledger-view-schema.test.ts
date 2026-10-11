import { describe, expect, it } from "vitest";

import {
  parseClientInvoices,
  parseLedger,
  parseLedgerClients,
} from "./ledger-view-schema";

const entry = (overrides: Record<string, unknown> = {}) => ({
  date: "2026-06-03",
  kind: "invoice",
  label: "Τιμολόγιο 87",
  debit: 1612,
  credit: 0,
  running: 1612,
  ...overrides,
});

const ledger = (overrides: Record<string, unknown> = {}) => ({
  clientId: "c1",
  clientName: "Καφέ Αθηνά",
  balance: 1612,
  overdue: 0,
  entries: [entry()],
  payment: {
    holder: "Εταιρεία Δοκιμής",
    bank: "Τράπεζα Δοκιμής",
    iban: "GR1601101250000000012300695",
  },
  toInvoice: { amount: 500, count: 1 },
  ...overrides,
});

describe("parseLedger", () => {
  it("should accept a full ledger for the team", () => {
    expect(parseLedger(ledger()).entries).toHaveLength(1);
  });

  it("should accept the client view with null toInvoice and no payment details", () => {
    const view = parseLedger(ledger({ toInvoice: null, payment: null }));

    expect(view.toInvoice).toBeNull();
    expect(view.payment).toBeNull();
  });

  it("should accept every ledger entry kind", () => {
    const entries = ["invoice", "receipt_doc", "credit", "payment"].map(
      (kind) => entry({ kind }),
    );

    expect(parseLedger(ledger({ entries })).entries).toHaveLength(4);
  });

  it("should reject an unknown entry kind", () => {
    expect(() =>
      parseLedger(ledger({ entries: [entry({ kind: "refund" })] })),
    ).toThrow();
  });

  it("should reject a missing balance", () => {
    expect(() => parseLedger(ledger({ balance: undefined }))).toThrow();
  });
});

describe("parseClientInvoices", () => {
  const item = {
    id: "i1",
    number: "87",
    kind: "invoice",
    issueDate: "2026-06-03",
    dueDate: "2026-06-23",
    total: 1612,
    paid: 0,
    remaining: 1612,
    status: "unpaid",
    creditForNumber: null,
  };

  it("should accept the client invoice list", () => {
    expect(parseClientInvoices({ items: [item] }).items).toHaveLength(1);
  });

  it("should reject an unknown status", () => {
    expect(() =>
      parseClientInvoices({ items: [{ ...item, status: "lost" }] }),
    ).toThrow();
  });
});

describe("parseLedgerClients", () => {
  it("should accept the clients with movements", () => {
    expect(
      parseLedgerClients([{ id: "c1", name: "Καφέ Αθηνά", balance: -500 }]),
    ).toHaveLength(1);
  });

  it("should reject a client without a balance", () => {
    expect(() =>
      parseLedgerClients([{ id: "c1", name: "Καφέ Αθηνά" }]),
    ).toThrow();
  });
});
