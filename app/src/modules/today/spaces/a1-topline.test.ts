import { describe, expect, it } from "vitest";

import type { ListGroup } from "./a1-list";
import { isCompanyQuietOf, toInvoiceCentsOf, toplineOf } from "./a1-topline";

const base = {
  remaining: 7,
  overdueCents: 0,
  toInvoiceCents: 184000,
  canSeeAmounts: true,
};

const groupOf = (
  id: ListGroup["id"],
  lines: ListGroup["lines"] = [],
): ListGroup => ({
  id,
  title: id,
  lines,
  more: [],
  failed: [],
});

const lineOf = (cardId: string, amountCents?: number) => ({
  cardId,
  laterKey: null,
  row: {
    label: cardId,
    href: "/x",
    ...(amountCents !== undefined ? { amountCents } : {}),
  },
});

describe("toplineOf", () => {
  it("should join remaining and money", () => {
    expect(toplineOf(base)).toBe("Μένουν 7 · 1.840 € να μπουν");
  });

  it("should omit money without the amounts permission", () => {
    expect(toplineOf({ ...base, canSeeAmounts: false })).toBe("Μένουν 7");
  });

  it("should omit money when both sums are null or zero", () => {
    expect(
      toplineOf({ ...base, overdueCents: null, toInvoiceCents: null }),
    ).toBe("Μένουν 7");
    expect(toplineOf({ ...base, overdueCents: 0, toInvoiceCents: 0 })).toBe(
      "Μένουν 7",
    );
  });

  it("should say nothing is left at zero", () => {
    expect(toplineOf({ ...base, remaining: 0 })).toBe("Δεν μένει τίποτα");
  });
});

describe("isCompanyQuietOf", () => {
  it("should show the quiet line when the company group is left out and its card is loaded", () => {
    expect(isCompanyQuietOf([groupOf("money")], ["health", "gdpr"])).toBe(true);
  });

  it("should not show the quiet line when the company group is visible", () => {
    expect(isCompanyQuietOf([groupOf("company")], ["health"])).toBe(false);
  });

  it("should not show the quiet line when no company card was loaded", () => {
    expect(isCompanyQuietOf([groupOf("money")], ["to_invoice"])).toBe(false);
  });
});

describe("toInvoiceCentsOf", () => {
  it("should sum the amounts of the to_invoice lines", () => {
    const groups = [
      groupOf("money", [
        lineOf("to_invoice", 100),
        lineOf("to_invoice", 250),
        lineOf("overdue_invoices", 900),
      ]),
    ];
    expect(toInvoiceCentsOf(groups)).toBe(350);
  });

  it("should return null when there are no to_invoice lines", () => {
    expect(
      toInvoiceCentsOf([groupOf("money", [lineOf("overdue_invoices", 900)])]),
    ).toBeNull();
  });
});
