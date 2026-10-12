import { describe, expect, it } from "vitest";

import { kindRowSchema, rulesFormSchema } from "./rules-schemas";

const KIND_ID = "11111111-1111-4111-8111-111111111111";
const baseRules = { internalReview: true, changesDays: "2" };

describe("rulesFormSchema", () => {
  it("should not carry reminder days: they live in the automations now", () => {
    expect(rulesFormSchema.parse({ ...baseRules, reminderDays: "3, 7" })).toEqual({
      internalReview: true,
      changesDays: 2,
    });
  });

  it("should accept zero changes days and reject more than thirty", () => {
    expect(rulesFormSchema.safeParse({ ...baseRules, changesDays: "0" }).success).toBe(true);
    expect(rulesFormSchema.safeParse({ ...baseRules, changesDays: "31" }).success).toBe(false);
  });

  it("should reject empty changes days instead of reading them as zero", () => {
    const result = rulesFormSchema.safeParse({ ...baseRules, changesDays: "" });
    expect(result.success).toBe(false);
    expect(result.success ? "" : result.error.issues[0]?.message).toBe(
      "Οι μέρες αλλαγών είναι ακέραιος αριθμός από 0 έως 30.",
    );
  });

  it("should reject changes days that are not a number, with a Greek message", () => {
    const result = rulesFormSchema.safeParse({ ...baseRules, changesDays: "abc" });
    expect(result.success ? "" : result.error.issues[0]?.message).toBe(
      "Οι μέρες αλλαγών είναι ακέραιος αριθμός από 0 έως 30.",
    );
  });
});

describe("kindRowSchema", () => {
  it("should accept a deadline in working days", () => {
    expect(kindRowSchema.safeParse({ id: KIND_ID, deadlineDays: "5" }).success).toBe(true);
  });

  it("should reject a deadline above 90 working days", () => {
    expect(kindRowSchema.safeParse({ id: KIND_ID, deadlineDays: "91" }).success).toBe(false);
  });

  it("should reject an empty deadline instead of reading it as zero", () => {
    expect(kindRowSchema.safeParse({ id: KIND_ID, deadlineDays: "" }).success).toBe(false);
  });
});
