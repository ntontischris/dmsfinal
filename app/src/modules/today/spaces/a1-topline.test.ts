import { describe, expect, it } from "vitest";

import type { Built } from "./a1-adapter";
import type { ListGroup } from "./a1-list";
import { companyStateOf, toInvoiceCentsOf, toplineOf } from "./a1-topline";

const base = {
  remaining: 7,
  overdueCents: 0,
  toInvoiceCents: 184000,
  canSeeAmounts: true,
};

const groupOf = (
  id: ListGroup["id"],
  lines: ListGroup["lines"] = [],
  failed: readonly string[] = [],
): ListGroup => ({ id, title: id, lines, more: [], failed });

const lineOf = (cardId: string, amountCents?: number) => ({
  cardId,
  laterKey: null,
  row: {
    label: cardId,
    href: "/x",
    ...(amountCents !== undefined ? { amountCents } : {}),
  },
});

const builtOf = (id: string, count: number): Built => ({
  card: { id, title: `Τίτλος ${id}`, source: "A1", kind: "status" },
  content: { count, rows: [], allHref: `/app/${id}`, emptyText: "" },
});

describe("toplineOf", () => {
  it("should join remaining and money", () => {
    expect(toplineOf(base)).toBe("Μένουν 7 · 1.840 € προς τιμολόγηση");
  });

  it("should split the money into overdue plus to invoice", () => {
    expect(toplineOf({ ...base, overdueCents: 375100, toInvoiceCents: 490000 })).toBe(
      "Μένουν 7 · 3.751 € ληξιπρόθεσμα + 4.900 € προς τιμολόγηση",
    );
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

describe("companyStateOf", () => {
  it("should say all is well when the company group is left out and every company card is at zero", () => {
    const state = companyStateOf(
      [builtOf("health", 0), builtOf("gdpr", 0)],
      [groupOf("money")],
    );
    expect(state).toEqual({ items: [], isClear: true });
  });

  it("should list each company card with a count and not say all is well", () => {
    const state = companyStateOf(
      [builtOf("health", 0), builtOf("gdpr", 2)],
      [groupOf("money")],
    );
    expect(state.isClear).toBe(false);
    expect(state.items).toEqual([
      { id: "gdpr", title: "Τίτλος gdpr", count: 2, href: "/app/gdpr" },
    ]);
  });

  it("should leave out company cards already shown as lines of the company group", () => {
    const state = companyStateOf(
      [builtOf("health", 1), builtOf("gdpr", 2)],
      [groupOf("company", [lineOf("health")])],
    );
    expect(state.isClear).toBe(false);
    expect(state.items.map((item) => item.id)).toEqual(["gdpr"]);
  });

  it("should leave out a failed company card because the group shows it", () => {
    const state = companyStateOf(
      [builtOf("health", 3)],
      [groupOf("company", [], ["health"])],
    );
    expect(state).toEqual({ items: [], isClear: false });
  });

  it("should not say all is well when no company card was loaded", () => {
    expect(
      companyStateOf([builtOf("to_invoice", 0)], [groupOf("money")]),
    ).toEqual({ items: [], isClear: false });
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
