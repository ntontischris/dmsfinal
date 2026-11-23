import { describe, expect, it } from "vitest";

import type { CardRow } from "./a1-model";
import type { ListGroup } from "./a1-list";
import { facesOf, initialsOf, lineTagOf, selectedGroupOf } from "./a1-deck-model";

// Τρίτη 24/11/2026, ώρα Ελλάδας (UTC+2).
const TODAY = "2026-11-24";

const rowOf = (label: string, extra: Partial<CardRow> = {}): CardRow => ({
  label,
  href: `/r/${label}`,
  ...extra,
});

const groupOf = (
  id: ListGroup["id"],
  rows: readonly CardRow[],
): ListGroup => ({
  id,
  title: id,
  lines: rows.map((row) => ({ cardId: "my_tasks", row, laterKey: null })),
  more: [],
  failed: [],
});

describe("initialsOf", () => {
  it("παίρνει τον Πελάτη πριν από την παύλα, δύο γράμματα", () => {
    expect(initialsOf("Φούρνος Παπαδόπουλου — Reels Νοεμβρίου")).toBe("ΦΠ");
  });

  it("μία λέξη δίνει ένα γράμμα, κενή ετικέτα τίποτα", () => {
    expect(initialsOf("ανάθεση")).toBe("Α");
    expect(initialsOf("  ")).toBe("");
  });
});

describe("lineTagOf", () => {
  it("η αναμονή γίνεται «σήμερα» ή μέρες", () => {
    expect(lineTagOf(rowOf("a", { waitingSince: "2026-11-24T08:00:00+00:00" }), TODAY)).toBe("σήμερα");
    expect(lineTagOf(rowOf("a", { waitingSince: "2026-11-21T08:00:00+00:00" }), TODAY)).toBe("3 ημέρες");
  });

  it("η ώρα της γραμμής γίνεται σήμερα/αύριο με ώρα, αλλιώς ημερομηνία", () => {
    expect(lineTagOf(rowOf("a", { at: "2026-11-24T08:00:00+00:00" }), TODAY)).toBe("σήμερα 10:00");
    expect(lineTagOf(rowOf("a", { at: "2026-11-25T15:30:00+00:00" }), TODAY)).toBe("αύριο 17:30");
    expect(lineTagOf(rowOf("a", { at: "2026-12-02T08:00:00+00:00" }), TODAY)).toBe("2/12");
  });

  it("χωρίς ώρα, καμία ετικέτα", () => {
    expect(lineTagOf(rowOf("a"), TODAY)).toBeNull();
    expect(lineTagOf(rowOf("a", { at: "όχι" }), TODAY)).toBeNull();
  });
});

describe("facesOf", () => {
  it("έως τρία διαφορετικά αρχικά, με τη σειρά των γραμμών", () => {
    const group = groupOf("client", [
      rowOf("Άλφα Βήτα — x"),
      rowOf("Άλφα Βήτα — y"),
      rowOf("Γάμα — z"),
      rowOf("Δέλτα Έψιλον — w"),
      rowOf("Ζήτα — v"),
    ]);
    expect(facesOf(group)).toEqual(["ΆΒ", "Γ", "ΔΈ"]);
  });
});

describe("selectedGroupOf", () => {
  const time = groupOf("time", [rowOf("a")]);
  const money = groupOf("money", [rowOf("b", { isUrgent: true })]);
  const keep = groupOf("keep", [rowOf("c")]);

  it("κρατά την ομάδα που ζητήθηκε, αν φαίνεται", () => {
    expect(selectedGroupOf([time, money, keep], "keep")?.id).toBe("keep");
  });

  it("αλλιώς την πρώτη με επείγον, αλλιώς την πρώτη", () => {
    expect(selectedGroupOf([time, money, keep], "company")?.id).toBe("money");
    expect(selectedGroupOf([time, keep], undefined)?.id).toBe("time");
    expect(selectedGroupOf([], undefined)).toBeNull();
  });
});
