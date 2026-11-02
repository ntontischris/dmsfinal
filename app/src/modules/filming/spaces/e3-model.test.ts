import { expect, test } from "vitest";

import {
  balanceOf,
  emptyCrewNote,
  fmtDay,
  hoursLabel,
  isOpenState,
} from "./e3-model";

test("η μέρα γράφεται με όνομα και ημερομηνία", () => {
  expect(fmtDay("2026-09-21")).toBe("Δευτέρα 21/09");
});

test("ώρες με κόμμα και σωστό ενικό", () => {
  expect(hoursLabel(1)).toBe("1 ώρα");
  expect(hoursLabel(2.5)).toBe("2,5 ώρες");
});

test("ανοιχτά είναι μόνο τα αναμένει έγκριση και προγραμματισμένο", () => {
  expect(isOpenState("pending")).toBe(true);
  expect(isOpenState("scheduled")).toBe(true);
  expect(isOpenState("done")).toBe(false);
});

test("το κενό Συνεργείο εξηγεί τι περιμένει", () => {
  expect(emptyCrewNote("pending", true)).toContain("Πρώτα έγκρινέ το");
  expect(emptyCrewNote("scheduled", false)).toContain("Πρόσθεσε άτομο");
});

test("η Παροχή μετρά και τα μεταφερμένα στο σύνολο", () => {
  expect(
    balanceOf({
      given: 4,
      carried: 1,
      used: 2,
      reserved: 1,
      balance: 2,
      kind: { id: "k", label: "Γύρισμα", measure: "per_filming" },
    }),
  ).toEqual({ total: 5, used: 2, reserved: 1, left: 2, kindLabel: "Γύρισμα" });
});
