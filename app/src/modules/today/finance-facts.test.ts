import { describe, expect, it } from "vitest";

import {
  parseBillablesTotal,
  parseReceiptAmounts,
  receivedInMonth,
} from "./finance-facts";

const receiptOf = (receivedOn: string, amount: number, deleted = false) => ({
  receivedOn,
  amount,
  deleted,
});

describe("receivedInMonth", () => {
  it("should add the receipts of the month and skip the deleted ones", () => {
    const receipts = [
      receiptOf("2026-11-02", 100.1),
      receiptOf("2026-11-20", 200.2),
      receiptOf("2026-11-21", 999, true),
      receiptOf("2026-10-31", 50),
    ];
    expect(receivedInMonth(receipts, "2026-11")).toBe(300.3);
  });

  it("should be zero when nothing came in that month", () => {
    expect(receivedInMonth([receiptOf("2026-10-01", 10)], "2026-11")).toBe(0);
  });
});

describe("parsers", () => {
  it("should read only the total of billables_view", () => {
    expect(parseBillablesTotal({ total: 7400, count: 8, clients: [] })).toBe(
      7400,
    );
  });

  it("should keep only the fields the month rule needs", () => {
    expect(
      parseReceiptAmounts([
        { ...receiptOf("2026-11-02", 10), id: "r1", clientName: "Πελάτης" },
      ]),
    ).toEqual([receiptOf("2026-11-02", 10)]);
  });
});
