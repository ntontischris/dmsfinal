import { expect, test } from "vitest";

import { ownershipOf } from "./b1-ownership";

test("δικός σου Πελάτης: καμία ετικέτα", () => {
  expect(ownershipOf("owner", "Άννα Δημητρίου")).toBeNull();
});

test("πρόσβαση μέσω δικής σου Ευκαιρίας: λέει ποιος είναι ο Υπεύθυνος", () => {
  expect(ownershipOf("granted", "Νίκος Βασιλείου")).toEqual({
    badge: "Μέσω της Ευκαιρίας σου",
    note: "Υπεύθυνος: Νίκος Βασιλείου",
  });
});

test("Πελάτης άλλου πωλητή: ζητάς πρόσβαση", () => {
  expect(ownershipOf("taken", "Νίκος Βασιλείου")?.badge).toBe("Ανήκει σε άλλον πωλητή");
});

test("Πελάτης χωρίς Υπεύθυνο δεν λέει ότι ανήκει σε άλλον", () => {
  const label = ownershipOf("taken", null);
  expect(label?.badge).toBe("Χωρίς Υπεύθυνο");
  expect(label?.note).not.toContain("άλλον");
});
