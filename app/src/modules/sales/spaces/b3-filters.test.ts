import { expect, test } from "vitest";

import { cardMatches, daysSince, type FilterCard } from "./b3-filters";

const card = (patch: Partial<FilterCard>): FilterCard => ({
  nextStepDue: null,
  lastContact: null,
  isForgotten: false,
  ...patch,
});

test("μέρες από μια ημερομηνία ως σήμερα", () => {
  expect(daysSince("2026-09-10", "2026-09-20")).toBe(10);
  expect(daysSince("2026-09-10T18:00:00Z", "2026-09-20")).toBe(10);
});

test("«αυτή την εβδομάδα»: Επόμενο βήμα από σήμερα ως 7 μέρες μετά", () => {
  const today = "2026-09-20";
  expect(cardMatches(card({ nextStepDue: "2026-09-24" }), "week", today)).toBe(true);
  expect(cardMatches(card({ nextStepDue: "2026-09-27" }), "week", today)).toBe(true);
  expect(cardMatches(card({ nextStepDue: "2026-09-28" }), "week", today)).toBe(false);
  expect(cardMatches(card({ nextStepDue: "2026-09-12" }), "week", today)).toBe(false);
});

test("«χωρίς επαφή»: καμία επαφή ή πάνω από 14 μέρες, ακόμα κι αν το βήμα είναι μελλοντικό", () => {
  const today = "2026-09-20";
  expect(
    cardMatches(card({ nextStepDue: "2026-10-20", lastContact: "2026-09-01" }), "quiet", today),
  ).toBe(true);
  expect(cardMatches(card({ lastContact: null }), "quiet", today)).toBe(true);
  expect(cardMatches(card({ lastContact: "2026-09-10" }), "quiet", today)).toBe(false);
});

test("«ξεχασμένες» και «όλες»", () => {
  expect(cardMatches(card({ isForgotten: true }), "forgotten", "2026-09-20")).toBe(true);
  expect(cardMatches(card({}), "forgotten", "2026-09-20")).toBe(false);
  expect(cardMatches(card({}), "all", "2026-09-20")).toBe(true);
});
