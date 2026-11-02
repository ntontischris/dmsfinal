import { describe, expect, test } from "vitest";

import type { ProductionCard } from "../types";
import {
  NO_SIGNALS,
  countByProduction,
  matches,
  nextFilmingsOf,
  ofClient,
  parseView,
  sortFor,
  toRow,
  visibleViews,
  type G1Signals,
} from "./g1-rows";

const card = (overrides: Partial<ProductionCard> = {}): ProductionCard => ({
  id: "p1",
  title: "Κυψέλη — Οκτώβριος",
  client: { id: "c1", name: "Κυψέλη" },
  period: { n: 1, starts: "2026-10-01", ends: "2026-10-31", state: "current" },
  owner: { id: "u1", name: "Μαρία Παπά" },
  state: "open",
  isInternal: false,
  ...overrides,
});

const internal = card({
  id: "p2",
  title: "Showreel",
  client: null,
  period: null,
  isInternal: true,
});

describe("φίλτρο Πελάτη", () => {
  test("μόνο οι Παραγωγές του", () => {
    const shown = ofClient([card(), internal], "c1");
    expect(shown.map((p) => p.id)).toEqual(["p1"]);
  });

  test("χωρίς φίλτρο Πελάτη: όλες", () => {
    const list = [card(), internal];
    expect(ofClient(list, undefined)).toEqual(list);
  });
});

describe("προβολές", () => {
  test("?view= κερδίζει, αλλιώς τα παλιά ?tab= και &internal=1", () => {
    expect(parseView({ view: "hours" })).toBe("hours");
    expect(parseView({ tab: "delivered" })).toBe("delivered");
    expect(parseView({ tab: "open", internal: "1" })).toBe("internal");
    expect(parseView({ view: "άγνωστη" })).toBe("open");
  });

  test("«Θέλουν ώρες» μόνο για όσους βλέπουν κόστος", () => {
    expect(visibleViews(false).map((v) => v.id)).not.toContain("hours");
    expect(visibleViews(true).map((v) => v.id)).toContain("hours");
  });

  test("κάθε προβολή κρατά τις δικές της", () => {
    const signals: G1Signals = { ...NO_SIGNALS, needsHours: new Set(["p3"]) };
    const delivered = card({ id: "p3", state: "delivered" });
    const list = [card(), internal, delivered];
    const ids = (view: Parameters<typeof matches>[0]) =>
      list.filter((p) => matches(view, p, signals)).map((p) => p.id);
    expect(ids("open")).toEqual(["p1", "p2"]);
    expect(ids("delivered")).toEqual(["p3"]);
    expect(ids("internal")).toEqual(["p2"]);
    expect(ids("hours")).toEqual(["p3"]);
    expect(ids("all")).toEqual(["p1", "p2", "p3"]);
  });

  test("Ανοιχτές: αρχή Περιόδου αύξουσα, χωρίς Περίοδο η παλαιότερη πρώτη", () => {
    // Η βάση δίνει νεότερη πρώτη.
    const list = [
      card({ id: "new-internal", period: null }),
      card({
        id: "nov",
        period: {
          n: 2,
          starts: "2026-11-01",
          ends: "2026-11-30",
          state: "next",
        },
      }),
      card({ id: "old-internal", period: null }),
      card({ id: "oct" }),
    ];
    expect(sortFor("open", list).map((p) => p.id)).toEqual([
      "old-internal",
      "new-internal",
      "oct",
      "nov",
    ]);
    expect(sortFor("all", list).map((p) => p.id)).toEqual(
      list.map((p) => p.id),
    );
  });
});

describe("γραμμή", () => {
  test("Πελάτης, Περίοδος, Υπεύθυνος και κατάσταση με τις λέξεις του prototype", () => {
    const row = toRow(card(), NO_SIGNALS);
    expect(row).toMatchObject({
      client: "Κυψέλη",
      period: "Οκτώβριος 2026",
      owner: "Μαρία Παπά",
      state: "ανοιχτή",
      nextFilming: "—",
      inReview: 0,
      needsHours: false,
      overrun: false,
    });
  });

  test("Εσωτερική χωρίς Υπεύθυνο", () => {
    const row = toRow({ ...internal, owner: null }, NO_SIGNALS);
    expect(row).toMatchObject({
      client: "Εσωτερική",
      period: "εσωτερική",
      owner: "Χωρίς υπεύθυνο",
    });
  });

  test("εφάπαξ: χωρίς Περίοδο αλλά με Πελάτη", () => {
    expect(toRow(card({ period: null }), NO_SIGNALS).period).toBe("εφάπαξ");
  });

  test("τα σήματα από τις άλλες αναγνώσεις", () => {
    const signals: G1Signals = {
      nextFilming: new Map([["p1", "2026-11-05"]]),
      inReview: new Map([["p1", 2]]),
      needsHours: new Set(["p1"]),
      overrun: new Set(["p1"]),
    };
    expect(toRow(card(), signals)).toMatchObject({
      nextFilming: "05/11/2026",
      inReview: 2,
      needsHours: true,
      overrun: true,
    });
  });
});

describe("συγκεντρώσεις", () => {
  test("επόμενο Γύρισμα: το νωρίτερο από τώρα και μετά", () => {
    const at = (id: string, startsAt: string) => ({
      startsAt,
      production: { id },
    });
    const next = nextFilmingsOf(
      [
        at("p1", "2026-10-01T08:00:00+00:00"),
        at("p1", "2026-11-10T08:00:00+00:00"),
        at("p1", "2026-11-05T08:00:00Z"),
        at("p2", "2026-10-02T08:00:00Z"),
      ],
      "2026-11-02T00:00:00.000Z",
    );
    expect(next.get("p1")).toBe("2026-11-05T08:00:00Z");
    expect(next.has("p2")).toBe(false);
  });

  test("Παραδοτέα προς έλεγχο ανά Παραγωγή", () => {
    const counts = countByProduction([
      { productionId: "p1" },
      { productionId: "p1" },
      { productionId: "p2" },
    ]);
    expect(counts.get("p1")).toBe(2);
    expect(counts.get("p2")).toBe(1);
  });
});
