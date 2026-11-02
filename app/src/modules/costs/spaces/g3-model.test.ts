import { describe, expect, it } from "vitest";

import {
  figuresOf,
  formOf,
  isSameValue,
  missingOf,
  parseNumber,
  valueOf,
  type CostBasis,
  type HoursValue,
} from "./g3-model";

const basis = (overrides: Partial<CostBasis> = {}): CostBasis => ({
  estimate: {
    hours: { shoot: 6, edit: 10 },
    hourCost: 40,
    directCost: 50,
    cost: 690,
  },
  price: 1200,
  hourCost: 45,
  overrunPercent: 20,
  multiplierMin: 1.3,
  ...overrides,
});

const value = (overrides: Partial<HoursValue> = {}): HoursValue => ({
  shoot: 6,
  shootConfirmed: true,
  edit: 10,
  editConfirmed: true,
  directCost: null,
  ...overrides,
});

describe("parseNumber", () => {
  it("should read the Greek decimal comma", () => {
    expect(parseNumber("6,5")).toBe(6.5);
  });

  it("should treat empty, negative or non-numeric text as missing", () => {
    expect(parseNumber(" ")).toBeNull();
    expect(parseNumber("-1")).toBeNull();
    expect(parseNumber("abc")).toBeNull();
  });
});

describe("missingOf", () => {
  it("should name every missing piece of half-written hours", () => {
    expect(
      missingOf(value({ shoot: null, edit: 3, editConfirmed: false })),
    ).toEqual(["λείπουν οι ώρες γυρίσματος", "το μοντάζ δεν επιβεβαιώθηκε"]);
  });

  it("should be empty when both hours are written and confirmed", () => {
    expect(missingOf(value())).toEqual([]);
  });
});

describe("figuresOf", () => {
  it("should leave the actual cost empty while hours are incomplete", () => {
    const f = figuresOf(basis(), value({ shootConfirmed: false }));
    expect(f.actual).toBeNull();
    expect(f.isOverrun).toBe(false);
  });

  it("should cost the actual hours at the month's hour cost plus the estimate's direct cost by default", () => {
    const f = figuresOf(basis(), value());
    expect(f.actual?.cost).toBe(16 * 45 + 50);
    expect(f.actual?.directCost).toBe(50);
  });

  it("should flag hours over the estimate by more than the overrun percent", () => {
    const f = figuresOf(basis(), value({ edit: 14 }));
    expect(f.hoursPercent).toBeCloseTo(0.25);
    expect(f.hoursOver).toBe(true);
    expect(f.isOverrun).toBe(true);
  });

  it("should flag a price below cost times the minimum multiplier", () => {
    const f = figuresOf(basis({ price: 900 }), value());
    expect(f.minimumPrice).toBeCloseTo(770 * 1.3);
    expect(f.belowMinimum).toBe(true);
  });

  it("should not judge the price of an internal production", () => {
    const f = figuresOf(basis({ price: null }), value());
    expect(f.belowMinimum).toBe(false);
    expect(f.minimumPrice).toBeCloseTo(770 * 1.3);
  });

  it("should keep the actual cost empty without an hour cost for the month", () => {
    const f = figuresOf(basis({ hourCost: null }), value());
    expect(f.actual?.cost).toBeNull();
    expect(f.minimumPrice).toBeNull();
    expect(f.belowMinimum).toBe(false);
  });
});

describe("formOf / valueOf", () => {
  it("should prefill the suggested shoot hours when none were written", () => {
    expect(
      formOf(value({ shoot: null, shootConfirmed: false }), 7.5).shoot,
    ).toBe("7,5");
  });

  it("should round-trip a saved value", () => {
    const saved = value({ shoot: 6.5, directCost: 120 });
    expect(isSameValue(valueOf(formOf(saved, 0)), saved)).toBe(true);
  });
});
