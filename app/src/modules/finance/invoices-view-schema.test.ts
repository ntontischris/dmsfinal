import { describe, expect, it } from "vitest";

import { parseInvoiceContext, parseInvoicesView } from "./invoices-view-schema";

const item = (overrides: Record<string, unknown> = {}) => ({
  id: "inv-1",
  number: "87",
  kind: "invoice",
  clientId: "c1",
  clientName: "Καφέ Αθηνά",
  issueDate: "2026-06-03",
  dueDate: "2026-06-23",
  total: 1612,
  paid: 0,
  remaining: 1612,
  status: "unpaid",
  creditForNumber: null,
  ...overrides,
});

const view = (items: unknown[] = [item()]) => ({
  totals: {
    turnoverMonth: 1300,
    unpaid: 1612,
    unpaidCount: 1,
    overdue: 0,
    overdueCount: 0,
  },
  counts: { all: 1, unpaid: 1, overdue: 0, credit: 0 },
  items,
});

describe("parseInvoicesView", () => {
  it("should parse totals, counts and items", () => {
    const parsed = parseInvoicesView(view());

    expect(parsed.totals.unpaid).toBe(1612);
    expect(parsed.counts.all).toBe(1);
    expect(parsed.items[0]?.status).toBe("unpaid");
  });

  it("should accept a credit note without a due date", () => {
    const parsed = parseInvoicesView(
      view([
        item({
          kind: "credit",
          dueDate: null,
          status: "credit",
          creditForNumber: "86",
        }),
      ]),
    );

    expect(parsed.items[0]?.dueDate).toBeNull();
    expect(parsed.items[0]?.creditForNumber).toBe("86");
  });

  it("should refuse a status the database does not know", () => {
    expect(() =>
      parseInvoicesView(view([item({ status: "cancelled" })])),
    ).toThrow();
  });

  it("should refuse a view without totals", () => {
    expect(() => parseInvoicesView({ items: [] })).toThrow();
  });
});

describe("parseInvoiceContext", () => {
  const context = {
    clientName: "Καφέ Αθηνά",
    clientTaxId: null,
    vatRate: 24,
    paymentDays: 15,
    toInvoice: 0,
    openBillables: [
      {
        id: "b1",
        label: "Περίοδος Ιούνιος",
        billableOn: "2026-06-01",
        open: 1300,
      },
    ],
    existingNumbers: ["86"],
    invoices: [{ id: "inv-1", number: "86", kind: "invoice" }],
  };

  it("should parse the context with a client that has no tax id", () => {
    const parsed = parseInvoiceContext(context);

    expect(parsed.clientTaxId).toBeNull();
    expect(parsed.openBillables).toHaveLength(1);
  });

  it("should refuse a context without the payment days", () => {
    const { paymentDays, ...rest } = context;

    expect(paymentDays).toBe(15);
    expect(() => parseInvoiceContext(rest)).toThrow();
  });
});
