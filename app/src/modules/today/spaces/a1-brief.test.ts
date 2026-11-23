import { describe, expect, it } from "vitest";

import { briefOf } from "./a1-brief";
import type { CardContent, CardDef, CardKind } from "./a1-model";

const GROUPS: Readonly<Record<string, string>> = {
  proposal_approvals: "decide",
  google_deletions: "decide",
  requests_mentions: "work",
  overdue_invoices: "money",
  week_filming: "week",
};

const builtOf = (
  id: string,
  count: number,
  kind: CardKind = "action",
): { card: CardDef; content: CardContent } => ({
  card: { id, title: `Τίτλος ${id}`, source: "A1", kind },
  content: {
    count,
    rows: Array.from({ length: Math.min(count, 3) }, (_, n) => ({
      label: `${id}-${n}`,
      href: `/app/${id}/${n}`,
    })),
    allHref: `/app/${id}`,
    emptyText: "",
  },
});

const brief = (
  built: ReturnType<typeof builtOf>[],
  failed: readonly string[] = [],
  hasMoneyPanel = false,
) =>
  briefOf({
    built,
    failed: new Set(failed),
    groupOf: (code) => GROUPS[code],
    hasMoneyPanel,
  });

describe("briefOf", () => {
  it("should send decision cards and client requests to decisions, and not Google deletions", () => {
    const result = brief([
      builtOf("proposal_approvals", 2),
      builtOf("requests_mentions", 1),
      builtOf("google_deletions", 1),
    ]);
    expect(result.decisions.map(({ card }) => card.id)).toEqual([
      "proposal_approvals",
      "requests_mentions",
    ]);
    expect(result.hasDecisions).toBe(true);
  });

  it("should send the week to the programme and overdue invoices to money", () => {
    const result = brief([
      builtOf("week_filming", 0, "info"),
      builtOf("overdue_invoices", 4),
    ]);
    expect(result.week?.card.id).toBe("week_filming");
    expect(result.money?.card.id).toBe("overdue_invoices");
    expect(result.overdue).toBe(4);
  });

  it("should leave money out when it is empty and not loaded as a panel", () => {
    const result = brief([builtOf("overdue_invoices", 0)]);
    expect(result.money).toBeNull();
    expect(result.overdue).toBe(0);
  });

  it("should keep the money panel without overdue invoices when money is loaded (month pace)", () => {
    const result = brief([builtOf("overdue_invoices", 0)], [], true);
    expect(result.money?.card.id).toBe("overdue_invoices");
  });

  it("should mark decisions as partial and keep a failed decision out of the list", () => {
    const result = brief(
      [builtOf("proposal_approvals", 0)],
      ["proposal_approvals"],
    );
    expect(result.decisions).toEqual([]);
    expect(result.hasDecisions).toBe(true);
    expect(result.isDecisionsPartial).toBe(true);
  });
});
