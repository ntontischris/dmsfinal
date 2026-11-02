import { describe, expect, it } from "vitest";

import type { CardData, CardItem, TodayCard } from "../view-schema";
import {
  athensStamp,
  builtOf,
  cardDefOf,
  needsItems,
  weekGlance,
} from "./a1-adapter";
import { nowOf } from "./a1-now";
import { zonesOf } from "./a1-zones";

// Φανταστικές κάρτες, στο σχήμα του today_counts / today_card.
const cardOf = (overrides: Partial<TodayCard> = {}): TodayCard => ({
  code: "unassigned",
  grp: "decide",
  kind: "action",
  label: "Χωρίς υπεύθυνο",
  link: "/app/unassigned",
  count: 2,
  failed: false,
  hidden: false,
  ...overrides,
});

const itemOf = (overrides: Partial<CardItem> = {}): CardItem => ({
  id: "i-1",
  title: "Κυψέλη Καφέ",
  subtitle: null,
  at: null,
  urgent: false,
  amountCents: null,
  link: "/app/pipeline/o-1",
  ...overrides,
});

const dataOf = (
  items: readonly CardItem[],
  count = items.length,
): CardData => ({
  code: "x",
  count,
  items: [...items],
});

describe("cardDefOf", () => {
  it("το είδος της βάσης γίνεται είδος του prototype, με την οθόνη-ουρά από τη διαδρομή", () => {
    expect(cardDefOf(cardOf())).toEqual({
      id: "unassigned",
      title: "Χωρίς υπεύθυνο",
      source: "B5",
      kind: "action",
      isTechnical: false,
    });
    expect(
      cardDefOf(
        cardOf({ kind: "week", code: "week_filming", link: "/app/filming" }),
      ).kind,
    ).toBe("info");
    expect(
      cardDefOf(
        cardOf({
          kind: "health",
          code: "health",
          link: "/app/settings/sends?tab=failed",
        }),
      ),
    ).toMatchObject({
      kind: "status",
      isTechnical: true,
      source: "K3",
    });
    expect(cardDefOf(cardOf({ code: "google_deletions" })).isTechnical).toBe(
      true,
    );
  });
});

describe("builtOf", () => {
  it("οι γραμμές κρατούν τίτλο, σύνδεσμο, επείγον, και στοιχεία με ποσό", () => {
    const { content } = builtOf(
      cardOf({ code: "overdue_invoices", link: "/app/finance/invoices" }),
      dataOf(
        [
          itemOf({
            subtitle: "ΤΠΥ 12",
            amountCents: 12_400,
            urgent: true,
            link: "/app/finance/invoices?x=1",
          }),
        ],
        5,
      ),
    );
    expect(content.count).toBe(5);
    expect(content.allHref).toBe("/app/finance/invoices");
    expect(content.rows).toHaveLength(1);
    expect(content.rows[0]).toMatchObject({
      label: "Κυψέλη Καφέ",
      href: "/app/finance/invoices?x=1",
      isUrgent: true,
    });
    expect(content.rows[0].meta).toMatch(/^ΤΠΥ 12 · 124,00/);
  });

  it("οι κάρτες με προθεσμία δείχνουν τη μέρα με το πρόθεμά τους", () => {
    const { content } = builtOf(
      cardOf({ code: "my_deliverables" }),
      dataOf([itemOf({ subtitle: "Reel", at: "2026-11-04T22:00:00Z" })]),
    );
    expect(content.rows[0].meta).toMatch(/^Reel · προθεσμία 5/);
  });

  it("άδεια κάρτα χωρίς στοιχεία: μόνο το πλήθος και το κείμενο του είδους της", () => {
    expect(builtOf(cardOf({ count: 0 }), null).content).toMatchObject({
      count: 0,
      rows: [],
      emptyText: "Τίποτα σε αναμονή.",
    });
  });

  it("τα επόμενα Γυρίσματα του πελάτη έχουν το κουμπί «Κλείσε Γύρισμα»", () => {
    expect(
      builtOf(cardOf({ code: "client_filming", kind: "week" }), dataOf([]))
        .content.cta,
    ).toEqual({
      label: "Κλείσε Γύρισμα",
      href: "/app/book",
    });
  });

  it("η πρώτη επείγουσα γραμμή γίνεται Τώρα και η κάρτα της πάει στα επείγοντα", () => {
    const calm = builtOf(cardOf({ code: "a", label: "A" }), dataOf([itemOf()]));
    const red = builtOf(
      cardOf({ code: "b", label: "B" }),
      dataOf([itemOf({ urgent: true, title: "Λήγει" })]),
    );
    expect(nowOf([calm, red])).toMatchObject({
      cardId: "b",
      title: "Λήγει",
      label: "B",
    });
    expect(zonesOf([calm, red]).urgent.map((item) => item.card.id)).toEqual([
      "b",
    ]);
  });
});

describe("needsItems", () => {
  it("φορτώνονται μόνο ορατές κάρτες με κάτι να δείξουν", () => {
    expect(needsItems(cardOf())).toBe(true);
    expect(needsItems(cardOf({ count: 0 }))).toBe(false);
    expect(needsItems(cardOf({ count: 0, kind: "week" }))).toBe(true);
    expect(needsItems(cardOf({ hidden: true }))).toBe(false);
    expect(needsItems(cardOf({ failed: true, count: null }))).toBe(false);
  });
});

describe("weekGlance", () => {
  it("«Η εβδομάδα» είναι οι κάρτες εβδομάδας με το πλήθος τους", () => {
    const cards = [
      cardOf(),
      cardOf({
        code: "week_filming",
        kind: "week",
        label: "Γυρίσματα των επόμενων 7 ημερών",
        link: "/app/filming",
        count: 3,
      }),
      cardOf({ code: "w2", kind: "week", hidden: true }),
    ];
    expect(weekGlance(cards)).toEqual([
      { label: "3 Γυρίσματα των επόμενων 7 ημερών", href: "/app/filming" },
    ]);
  });
});

describe("athensStamp", () => {
  it("η στιγμή σε ώρα Ελλάδας", () => {
    expect(athensStamp(new Date("2026-11-02T08:05:00Z"))).toBe(
      "2026-11-02T10:05",
    );
    expect(athensStamp(new Date("2026-07-01T21:30:00Z"))).toBe(
      "2026-07-02T00:30",
    );
  });
});
