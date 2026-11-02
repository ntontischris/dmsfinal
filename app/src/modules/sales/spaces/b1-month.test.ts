import { expect, test } from "vitest";

import type { ClientProvision } from "../types";
import { monthGlance } from "./b1-month";

const shoot = (overrides: Partial<ClientProvision> = {}): ClientProvision => ({
  kindId: "k-shoot",
  unit: "Γυρίσματα",
  isShoot: true,
  given: 3,
  carried: 0,
  used: 1,
  reserved: 0,
  ...overrides,
});
const reels: ClientProvision = { kindId: "k-reel", unit: "Reels", isShoot: false, given: 8, carried: 1, used: 4, reserved: 0 };

test("μηνιαίος Πελάτης: γυρίσματα και reels του μήνα, έγιναν από όσα δόθηκαν", () => {
  const glance = monthGlance([shoot(), reels], null);
  expect(glance?.text).toContain("γυρίσματα: έγινε 1 από 3");
  expect(glance?.text).toContain("reels: 4 από 9");
});

test("δείχνει το επόμενο γύρισμα του Πελάτη, σε ώρα Ελλάδας", () => {
  expect(monthGlance([shoot()], "2026-09-20T22:30:00Z")?.text).toContain("επόμενο γύρισμα 21/09");
});

test("χωρίς γύρισμα αυτόν τον μήνα: μόνο όποιος δικαιούται γύρισμα και δεν έχει κανένα έγινε ή κλεισμένο", () => {
  expect(monthGlance([shoot()], null)?.hasNoShoot).toBe(false);
  expect(monthGlance([shoot({ used: 0, reserved: 1 })], null)?.hasNoShoot).toBe(false);
  expect(monthGlance([shoot({ used: 0 })], null)?.hasNoShoot).toBe(true);
  expect(monthGlance([reels], null)?.hasNoShoot).toBe(false);
});

test("Πελάτης χωρίς μηνιαία Συμφωνία δεν έχει εικόνα μήνα", () => {
  expect(monthGlance([], "2026-09-21T09:00:00Z")).toBeNull();
});

test("μπάρες και κομμάτια του μήνα: ανά Παροχή πόσα έγιναν από πόσα, και το επόμενο γύρισμα χωριστά", () => {
  const glance = monthGlance([shoot(), reels], "2026-09-21T09:00:00Z");
  expect(glance?.meters).toContainEqual({ label: "γυρίσματα", used: 1, total: 3 });
  expect(glance?.meters).toContainEqual({ label: "reels", used: 4, total: 9 });
  expect(glance?.chips).toEqual(["γυρίσματα 1/3", "reels 4/9", "επόμενο 21/09"]);
  expect(glance?.next).toBe("21/09");
});
