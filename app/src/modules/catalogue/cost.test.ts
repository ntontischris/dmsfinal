import { describe, expect, it } from "vitest";

import { costOf, marginOf, minimumMargin, priceRange, roundMoney } from "./cost";
import type { CatalogueItem, CostHint, ItemCost } from "./types";

const HINT: CostHint = {
  hourCostMonth: "2026-10-01",
  hourCost: 40,
  multipliers: { min: 1.3, target: 1.6, max: 2 },
};

const item = (changes: Partial<CatalogueItem> = {}): CatalogueItem => ({
  id: "11111111-1111-4111-8111-111111111111",
  kind: "package",
  billing: "monthly",
  name: "Social A",
  nameEn: "",
  description: "",
  unit: "",
  isPublic: false,
  showsPrice: false,
  descriptionPublic: "",
  descriptionPublicEn: "",
  isRetired: false,
  price: 1300,
  hoursShoot: 6,
  hoursEdit: 14,
  directCost: 0,
  directCostNote: "",
  provisions: [],
  uses: 0,
  updatedAt: "2026-10-08T10:00:00Z",
  updatedByName: null,
  ...changes,
});

const costOfItem = (changes: Partial<CatalogueItem> = {}): ItemCost => {
  const cost = costOf(item(changes), HINT);
  if (cost === null) throw new Error("το κόστος θα έπρεπε να υπολογίζεται");
  return cost;
};

describe("roundMoney", () => {
  it("στρογγυλοποιεί στο λεπτό", () => {
    expect(roundMoney(1040.0000000000002)).toBe(1040);
    expect(roundMoney(123.9876)).toBe(123.99);
  });
});

describe("priceRange", () => {
  it("πολλαπλασιάζει το κόστος με κάθε πολλαπλασιαστή", () => {
    expect(priceRange(800, HINT.multipliers)).toEqual({
      min: 1040,
      target: 1280,
      max: 1600,
    });
  });
  it("με κόστος 0 δίνει παντού 0", () => {
    expect(priceRange(0, HINT.multipliers)).toEqual({ min: 0, target: 0, max: 0 });
  });
});

describe("costOf", () => {
  it("υπολογίζει το παράδειγμα του πρωτοτύπου", () => {
    const cost = costOfItem();
    expect(cost.totalHours).toBe(20);
    expect(cost.hoursCost).toBe(800);
    expect(cost.estimatedCost).toBe(800);
    expect(cost.range).toEqual({ min: 1040, target: 1280, max: 1600 });
    expect(cost.hasHours).toBe(true);
  });
  it("προσθέτει το Άμεσο κόστος", () => {
    expect(costOfItem({ directCost: 25.5 }).estimatedCost).toBe(825.5);
  });
  it("βλέπει null Άμεσο κόστος ως 0 όταν οι ώρες φαίνονται", () => {
    expect(costOfItem({ directCost: null }).directCost).toBe(0);
  });
  it("δεν έχει ώρες όταν είναι 0 και 0", () => {
    expect(costOfItem({ hoursShoot: 0, hoursEdit: 0 }).hasHours).toBe(false);
  });
  it("δίνει null χωρίς hint", () => {
    expect(costOf(item(), null)).toBeNull();
  });
  it("δίνει null όταν δεν έχει οριστεί Κόστος ώρας", () => {
    expect(costOf(item(), { ...HINT, hourCost: null })).toBeNull();
  });
  it("δίνει null όταν ο θεατής δεν βλέπει ώρες", () => {
    expect(costOf(item({ hoursShoot: null, hoursEdit: null }), HINT)).toBeNull();
  });
});

describe("marginOf", () => {
  const cost = costOfItem();
  it("δίνει ποσό και ποσοστό επί της τιμής", () => {
    const margin = marginOf(1300, cost);
    expect(margin.amount).toBe(500);
    expect(margin.percent).toBeCloseTo(0.3846, 4);
    expect(margin.isBelowMin).toBe(false);
  });
  it("η ελάχιστη τιμή επιτρέπεται", () => {
    expect(marginOf(1040, cost).isBelowMin).toBe(false);
  });
  it("ένα λεπτό κάτω από την ελάχιστη είναι κάτω από το ελάχιστο", () => {
    expect(marginOf(1039.99, cost).isBelowMin).toBe(true);
  });
  it("με τιμή 0 το ποσοστό είναι 0, όχι διαίρεση με το μηδέν", () => {
    expect(marginOf(0, cost).percent).toBe(0);
  });
  it("με κόστος 0 δεν είναι ποτέ κάτω από το ελάχιστο", () => {
    const free = costOfItem({ hoursShoot: 0, hoursEdit: 0 });
    expect(marginOf(0, free).isBelowMin).toBe(false);
  });
});

describe("minimumMargin", () => {
  it("βγαίνει από τον μικρότερο πολλαπλασιαστή", () => {
    expect(minimumMargin(1.3)).toBeCloseTo(0.2308, 4);
  });
  it("με πολλαπλασιαστή 1 είναι 0", () => {
    expect(minimumMargin(1)).toBe(0);
  });
});
