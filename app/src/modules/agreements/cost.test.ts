import { describe, expect, it } from "vitest";

import { marginOf, priceRange, roundMoney } from "./cost";

describe("roundMoney", () => {
  it("στρογγυλεύει στο λεπτό", () => {
    expect(roundMoney(1.005)).toBe(1.01);
    expect(roundMoney(1039.994)).toBe(1039.99);
  });
});

describe("priceRange", () => {
  it("πολλαπλασιάζει το κόστος με κάθε πολλαπλασιαστή", () => {
    expect(priceRange(800, { min: 1.3, target: 1.6, max: 2 })).toEqual({
      min: 1040,
      target: 1280,
      max: 1600,
    });
  });
  it("στρογγυλεύει κάθε άκρο χωριστά", () => {
    expect(priceRange(333.33, { min: 1.3, target: 1.5, max: 1.7 })).toEqual({
      min: 433.33,
      target: 500,
      max: 566.66,
    });
  });
});

describe("marginOf", () => {
  it("δίνει ποσό και ποσοστό", () => {
    const margin = marginOf(1300, 800, 1.3);
    expect(margin.amount).toBe(500);
    expect(margin.percent).toBeCloseTo(0.3846, 4);
    expect(margin.isBelowMin).toBe(false);
  });
  it("η ελάχιστη τιμή επιτρέπεται", () => {
    expect(marginOf(1040, 800, 1.3).isBelowMin).toBe(false);
  });
  it("κάτω από το ελάχιστο όταν η τιμή είναι αυστηρά μικρότερη", () => {
    expect(marginOf(1039.99, 800, 1.3).isBelowMin).toBe(true);
  });
  it("τιμή 0: το ποσοστό είναι 0", () => {
    expect(marginOf(0, 800, 1.3).percent).toBe(0);
  });
  it("κόστος 0: ποτέ κάτω από το ελάχιστο", () => {
    expect(marginOf(100, 0, 1.3).isBelowMin).toBe(false);
  });
});
