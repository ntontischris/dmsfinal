import { describe, expect, it } from "vitest";

import { rankDecisions } from "./a1-decisions";
import {
  isNewSince,
  itemKeyOf,
  laterLineOf,
  newChipOf,
  newCountOf,
  withoutLater,
} from "./a1-later";
import { leadOf } from "./a1-lead";
import type { CardContent, CardDef, CardRow } from "./a1-model";

const cardOf = (
  id: string,
  rows: readonly CardRow[],
  count = rows.length,
): { card: CardDef; content: CardContent } => ({
  card: { id, title: `Κάρτα ${id}`, source: "A1", kind: "action" },
  content: { count, rows, allHref: `/app/${id}`, emptyText: "" },
});

const rowOf = (id: string, extra: Partial<CardRow> = {}): CardRow => ({
  id,
  label: `Απόφαση ${id}`,
  href: `/app/x/${id}`,
  ...extra,
});

const SEEN_AT = "2026-11-05T08:00:00+00:00";

describe("itemKeyOf", () => {
  it("κωδικός κάρτας και id της γραμμής· χωρίς id κανένα κλειδί", () => {
    expect(itemKeyOf("unassigned", rowOf("opportunity:1"))).toBe(
      "unassigned:opportunity:1",
    );
    expect(itemKeyOf("unassigned", { label: "x", href: "/app" })).toBeNull();
  });
});

describe("isNewSince", () => {
  it("νέο όταν ζητήθηκε μετά την προηγούμενη επίσκεψη (waitingSince πριν από το at)", () => {
    const fresh = rowOf("1", { waitingSince: "2026-11-05T09:00:00+00:00" });
    const old = rowOf("2", {
      waitingSince: "2026-11-04T09:00:00+00:00",
      at: "2026-11-09T09:00:00+00:00",
    });
    const atOnly = rowOf("3", { at: "2026-11-05T08:30:00+00:00" });
    expect(isNewSince(fresh, SEEN_AT)).toBe(true);
    expect(isNewSince(old, SEEN_AT)).toBe(false);
    expect(isNewSince(atOnly, SEEN_AT)).toBe(true);
    expect(isNewSince(rowOf("4"), SEEN_AT)).toBe(false);
  });

  it("πρώτη επίσκεψη: τίποτα δεν είναι νέο", () => {
    expect(
      isNewSince(
        rowOf("1", { waitingSince: "2026-11-05T09:00:00+00:00" }),
        null,
      ),
    ).toBe(false);
  });
});

describe("withoutLater", () => {
  const cards = [
    cardOf("a", [rowOf("1"), rowOf("2")], 4),
    cardOf("b", [rowOf("3")]),
  ];

  it("βγάζει τις κρυμμένες από τη λίστα και από το πλήθος", () => {
    const { cards: kept, later } = withoutLater(cards, ["a:2", "b:3", "a:999"]);
    expect(later).toEqual(["a:2", "b:3"]);
    expect(kept.map(({ content }) => content.count)).toEqual([3, 0]);
    expect(kept[0]?.content.rows.map((row) => row.id)).toEqual(["1"]);
    const ranked = rankDecisions(kept);
    expect(ranked.total).toBe(3);
    expect(ranked.shown.map((row) => row.id)).toEqual(["1"]);
  });

  it("η πρόταση της κορυφής μετρά χωρίς τις κρυμμένες", () => {
    const { cards: kept } = withoutLater(cards, ["a:2"]);
    expect(
      leadOf({
        filming: null,
        decisions: rankDecisions(kept).total,
        overdue: null,
      }),
    ).toBe("4 αποφάσεις περιμένουν μόνο εσένα.");
  });

  it("χωρίς «Αργότερα» όλα μένουν ίδια", () => {
    const { cards: kept, later } = withoutLater(cards, []);
    expect(later).toEqual([]);
    expect(kept).toEqual(cards);
  });
});

describe("newCountOf / newChipOf", () => {
  it("μετρά τα νέα που δεν κρύφτηκαν", () => {
    const { cards: kept } = withoutLater(
      [
        cardOf("a", [
          rowOf("1", { waitingSince: "2026-11-05T09:00:00+00:00" }),
          rowOf("2", { waitingSince: "2026-11-05T10:00:00+00:00" }),
          rowOf("3", { waitingSince: "2026-11-01T10:00:00+00:00" }),
        ]),
      ],
      ["a:2"],
    );
    expect(newCountOf(kept, SEEN_AT)).toBe(1);
    expect(newChipOf(1)).toBe("1 νέο από την τελευταία φορά");
    expect(newChipOf(3)).toBe("3 νέα από την τελευταία φορά");
    expect(newChipOf(0)).toBeNull();
  });
});

describe("laterLineOf", () => {
  it("η ήσυχη γραμμή: πόσες και πότε ξαναβγαίνουν", () => {
    expect(laterLineOf(2, "2026-11-05T12:30")).toBe(
      "2 για αργότερα · ξαναβγαίνουν αύριο το πρωί",
    );
    expect(laterLineOf(1, "2026-11-05T12:30")).toBe(
      "1 για αργότερα · ξαναβγαίνει αύριο το πρωί",
    );
    expect(laterLineOf(1, "2026-11-05T06:15")).toBe(
      "1 για αργότερα · ξαναβγαίνει στις 8 το πρωί",
    );
    expect(laterLineOf(0, "2026-11-05T12:30")).toBeNull();
  });
});
