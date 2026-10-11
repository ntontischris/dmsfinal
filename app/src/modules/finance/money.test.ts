import { describe, expect, it } from "vitest";

import { athensToday, formatReceiptDate, parseReceiptAmount } from "./money";

describe("parseReceiptAmount", () => {
  it("δέχεται κόμμα ή τελεία με έως 2 δεκαδικά", () => {
    expect(parseReceiptAmount("150,50")).toBe(150.5);
    expect(parseReceiptAmount("150.5")).toBe(150.5);
    expect(parseReceiptAmount(" 20 ")).toBe(20);
  });

  it("απορρίπτει κενό, αρνητικό και με τρία δεκαδικά", () => {
    expect(parseReceiptAmount("")).toBeUndefined();
    expect(parseReceiptAmount("-5")).toBeUndefined();
    expect(parseReceiptAmount("1,234")).toBeUndefined();
  });
});

describe("formatReceiptDate", () => {
  it("γράφει την ημερομηνία ΗΗ/ΜΜ/ΕΕΕΕ", () => {
    expect(formatReceiptDate("2026-10-05")).toBe("05/10/2026");
  });
});

describe("athensToday", () => {
  it("δίνει τη μέρα στην Ελλάδα, ακόμα και λίγο μετά τα μεσάνυχτα UTC", () => {
    expect(athensToday(new Date("2026-10-10T22:30:00Z"))).toBe("2026-10-11");
  });
});
