import { describe, expect, it } from "vitest";

import { affectedText, roleAffectedSchema } from "./role-affected";

describe("affectedText", () => {
  it("should say nobody is affected when the role has no holders", () => {
    expect(affectedText({ names: [], total: 0, more: 0 })).toBe("Κανείς δεν έχει ακόμα αυτόν τον Ρόλο.");
  });

  it("should list every name when there are ten or fewer", () => {
    expect(affectedText({ names: ["Άννα", "Νίκος"], total: 2, more: 0 })).toBe("Επηρεάζει: Άννα, Νίκος.");
  });

  it("should add the remaining count after the first ten names", () => {
    const names = Array.from({ length: 10 }, (_, i) => `Χρήστης ${i + 1}`);
    expect(affectedText({ names, total: 13, more: 3 })).toMatch(/Χρήστης 10 και 3 ακόμη\.$/);
  });
});

describe("roleAffectedSchema", () => {
  it("should reject a negative remaining count", () => {
    expect(roleAffectedSchema.safeParse({ names: [], total: 0, more: -1 }).success).toBe(false);
  });
});
