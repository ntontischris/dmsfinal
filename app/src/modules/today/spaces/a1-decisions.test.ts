import { describe, expect, it } from "vitest";

import type { CardContent, CardDef, CardRow } from "./a1-model";
import { DECISIONS_SHOWN, rankDecisions } from "./a1-decisions";

const cardOf = (
  id: string,
  rows: readonly CardRow[],
  count = rows.length,
): { card: CardDef; content: CardContent } => ({
  card: { id, title: `Κάρτα ${id}`, source: "A1", kind: "action" },
  content: { count, rows, allHref: `/app/${id}`, emptyText: "" },
});

const rowOf = (label: string, extra: Partial<CardRow> = {}): CardRow => ({
  label,
  href: `/app/x/${label}`,
  ...extra,
});

describe("rankDecisions", () => {
  it("πρώτα ό,τι έχει ποσό (μεγαλύτερο πρώτα), μετά το παλαιότερο, μετά τα υπόλοιπα", () => {
    const ranked = rankDecisions([
      cardOf("a", [
        rowOf("χωρίς"),
        rowOf("νέο", { at: "2026-11-04T10:00:00+00:00" }),
      ]),
      cardOf("b", [
        rowOf("μικρό", { amountCents: 10_000 }),
        rowOf("παλιό", { at: "2026-10-01T10:00:00+00:00" }),
        rowOf("μεγάλο", { amountCents: 90_000 }),
      ]),
    ]);
    expect(ranked.shown.map((row) => row.label)).toEqual([
      "μεγάλο",
      "μικρό",
      "παλιό",
      "νέο",
      "χωρίς",
    ]);
  });

  it("χωρίς ποσό: όποιο περιμένει περισσότερο (waitingSince) πριν από την ώρα του (at)", () => {
    const ranked = rankDecisions([
      cardOf("filming", [
        rowOf("κράτηση αύριο, ζητήθηκε χθες", {
          at: "2026-11-06T10:00:00+00:00",
          waitingSince: "2026-11-04T10:00:00+00:00",
        }),
      ]),
      cardOf("access", [
        rowOf("πρόσβαση εδώ και 10 μέρες", {
          at: "2026-10-26T10:00:00+00:00",
          waitingSince: "2026-10-26T10:00:00+00:00",
        }),
      ]),
      cardOf("gdpr", [
        rowOf("χωρίς waitingSince, παλιό at", {
          at: "2026-11-01T10:00:00+00:00",
        }),
      ]),
    ]);
    expect(ranked.shown.map((row) => row.label)).toEqual([
      "πρόσβαση εδώ και 10 μέρες",
      "χωρίς waitingSince, παλιό at",
      "κράτηση αύριο, ζητήθηκε χθες",
    ]);
  });

  it("κάθε γραμμή ξέρει την κάρτα της", () => {
    const [row] = rankDecisions([cardOf("a", [rowOf("ένα")])]).shown;
    expect(row).toMatchObject({ cardId: "a", cardTitle: "Κάρτα a" });
  });

  it(`δείχνει έως ${DECISIONS_SHOWN}· τα υπόλοιπα μετρούν από τα πλήθη των καρτών`, () => {
    const ranked = rankDecisions([
      cardOf("a", [rowOf("1"), rowOf("2"), rowOf("3")], 4),
      cardOf("b", [rowOf("4"), rowOf("5"), rowOf("6")], 9),
    ]);
    expect(ranked.shown).toHaveLength(DECISIONS_SHOWN);
    expect(ranked.total).toBe(13);
    expect(ranked.more).toEqual({ count: 8, href: "/app/b" });
  });

  it("χωρίς υπόλοιπα δεν υπάρχει «Και N ακόμα»", () => {
    const ranked = rankDecisions([cardOf("a", [rowOf("1"), rowOf("2")])]);
    expect(ranked.more).toBeNull();
    expect(ranked.total).toBe(2);
  });

  it("χωρίς κάρτες: άδεια λίστα", () => {
    expect(rankDecisions([])).toEqual({ shown: [], total: 0, more: null });
  });
});
