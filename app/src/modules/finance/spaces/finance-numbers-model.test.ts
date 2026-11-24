import { describe, expect, it } from "vitest";

import { financeNumbersOf, type FinanceFacts } from "./finance-numbers-model";

const factsOf = (overrides: Partial<FinanceFacts> = {}): FinanceFacts => ({
  toInvoice: null,
  unpaid: null,
  receipts: null,
  month: "2026-11",
  ...overrides,
});

const receiptOf = (receivedOn: string, amount: number, deleted = false) => ({
  receivedOn,
  amount,
  deleted,
});

describe("financeNumbersOf", () => {
  it("should give no card numbers when nothing loaded", () => {
    expect(financeNumbersOf(factsOf())).toEqual({});
  });

  it("should count clients waiting and their total for to-invoice", () => {
    const numbers = financeNumbersOf(
      factsOf({ toInvoice: { clients: 3, total: 1500 } }),
    );
    expect(numbers.I1?.count).toBe("3");
    expect(numbers.I1?.hint).toContain("περιμένουν");
  });

  it("should say all invoiced when no client waits", () => {
    const numbers = financeNumbersOf(
      factsOf({ toInvoice: { clients: 0, total: 0 } }),
    );
    expect(numbers.I1).toEqual({ count: "0", hint: "όλα τιμολογημένα" });
  });

  it("should mark unpaid invoices urgent only when one is overdue", () => {
    const late = financeNumbersOf(
      factsOf({ unpaid: { count: 2, total: 900, overdue: 1 } }),
    );
    const onTime = financeNumbersOf(
      factsOf({ unpaid: { count: 2, total: 900, overdue: 0 } }),
    );
    expect(late.I2?.isUrgent).toBe(true);
    expect(onTime.I2?.isUrgent).toBe(false);
    expect(late.I2?.hint).toContain("μας χρωστούν");
  });

  it("should count only this month's receipts that are not deleted", () => {
    const numbers = financeNumbersOf(
      factsOf({
        receipts: [
          receiptOf("2026-11-03", 200),
          receiptOf("2026-11-20", 300),
          receiptOf("2026-11-21", 999, true),
          receiptOf("2026-10-30", 400),
        ],
      }),
    );
    expect(numbers.I4?.count).toBe("2");
    expect(numbers.I4?.hint).toContain("μπήκαν τον μήνα");
  });

  it("should say none this month when no receipt is in the month", () => {
    const numbers = financeNumbersOf(
      factsOf({ receipts: [receiptOf("2026-10-30", 400)] }),
    );
    expect(numbers.I4).toEqual({ count: "0", hint: "καμία αυτόν τον μήνα" });
  });
});
