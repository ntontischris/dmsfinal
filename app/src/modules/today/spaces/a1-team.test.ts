import { describe, expect, it } from "vitest";

import type { TeamPerson } from "../view-schema";
import { teamFineOf, teamLineOf, teamPillOf } from "./a1-team";

const personOf = (overrides: Partial<TeamPerson> = {}): TeamPerson => ({
  id: "u1",
  name: "Πέτρος Παπάς",
  late: 0,
  oldestDays: null,
  steps: 0,
  versions: 0,
  ...overrides,
});

describe("teamLineOf", () => {
  it("μόνο ό,τι κόλλησε, με το παλαιότερο", () => {
    expect(teamLineOf(personOf({ late: 2, oldestDays: 5 }))).toBe(
      "2 εκπρόθεσμα Παραδοτέα (το παλαιότερο 5 ημέρες)",
    );
    expect(teamLineOf(personOf({ late: 1, oldestDays: 1, steps: 1 }))).toBe(
      "1 εκπρόθεσμο Παραδοτέο (το παλαιότερο 1 ημέρα) · 1 Επόμενο βήμα έληξε",
    );
  });

  it("βήματα και Εκδόσεις σε πληθυντικό", () => {
    expect(teamLineOf(personOf({ steps: 3, versions: 2 }))).toBe(
      "3 Επόμενα βήματα έληξαν · 2 Εκδόσεις περιμένουν έλεγχο",
    );
    expect(teamLineOf(personOf({ versions: 1 }))).toBe(
      "1 Έκδοση περιμένει έλεγχο",
    );
  });
});

describe("teamPillOf", () => {
  it("«πίσω» όταν κάτι έληξε, «ουρά» όταν μόνο περιμένουν Εκδόσεις", () => {
    expect(teamPillOf(personOf({ late: 1 })).label).toBe("πίσω");
    expect(teamPillOf(personOf({ steps: 1 })).label).toBe("πίσω");
    expect(teamPillOf(personOf({ versions: 4 }))).toEqual({
      label: "ουρά",
      tone: "waiting",
    });
  });
});

describe("teamFineOf", () => {
  it("οι υπόλοιποι της ομάδας", () => {
    expect(teamFineOf(2, 4)).toBe("Οι άλλοι 4 της ομάδας είναι στην ώρα τους.");
    expect(teamFineOf(2, 1)).toBe(
      "1 ακόμα άτομο της ομάδας είναι στην ώρα του.",
    );
    expect(teamFineOf(3, 0)).toBeNull();
  });

  it("κανείς δεν κόλλησε", () => {
    expect(teamFineOf(0, 5)).toBe(
      "Κανείς δεν κόλλησε. Και οι 5 της ομάδας είναι στην ώρα τους.",
    );
  });
});
