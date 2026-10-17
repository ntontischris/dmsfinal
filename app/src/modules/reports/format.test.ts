import { describe, expect, it } from "vitest";

import {
  DASH,
  dateLabel,
  moneyOrDash,
  monthLabel,
  percentOrDash,
} from "./format";

describe("moneyOrDash", () => {
  it("should show a dash when the amount is hidden", () => {
    expect(moneyOrDash(null)).toBe(DASH);
  });

  it("should format euros the Greek way", () => {
    expect(moneyOrDash(1612)).toMatch(/1\.612,00/);
    expect(moneyOrDash(0)).toMatch(/0,00/);
  });
});

describe("percentOrDash", () => {
  it("should show a share with one decimal", () => {
    expect(percentOrDash(0.8571)).toMatch(/85,7/);
  });

  it("should show a dash when the share is hidden", () => {
    expect(percentOrDash(null)).toBe(DASH);
  });
});

describe("monthLabel", () => {
  it("should name the month in Greek with its year", () => {
    expect(monthLabel("2026-03")).toBe("Μάρτιος 2026");
    expect(monthLabel("2025-12")).toBe("Δεκέμβριος 2025");
  });
});

describe("dateLabel", () => {
  it("should show a day as dd/mm/yyyy", () => {
    expect(dateLabel("2026-03-15")).toBe("15/03/2026");
  });
});
