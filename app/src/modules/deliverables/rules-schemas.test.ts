import { describe, expect, it } from "vitest";

import {
  formatReminderDays,
  kindRowSchema,
  rulesFormSchema,
} from "./rules-schemas";

const KIND_ID = "11111111-1111-4111-8111-111111111111";
const baseRules = { internalReview: true, changesDays: "2", reminderDays: "3, 7" };

describe("formatReminderDays", () => {
  it("should show reminder days as a comma-separated line", () => {
    expect(formatReminderDays([3, 7])).toBe("3, 7");
  });

  it("should show no text when there are no reminders", () => {
    expect(formatReminderDays([])).toBe("");
  });
});

describe("rulesFormSchema", () => {
  it("should read the reminder line into a list of days", () => {
    expect(rulesFormSchema.parse(baseRules).reminderDays).toEqual([3, 7]);
  });

  it("should accept an empty reminder line as no reminders", () => {
    expect(rulesFormSchema.parse({ ...baseRules, reminderDays: "" }).reminderDays).toEqual([]);
  });

  it("should reject reminder days that are not in ascending order", () => {
    expect(rulesFormSchema.safeParse({ ...baseRules, reminderDays: "7, 3" }).success).toBe(false);
  });

  it("should reject duplicate reminder days", () => {
    expect(rulesFormSchema.safeParse({ ...baseRules, reminderDays: "3, 3" }).success).toBe(false);
  });

  it("should reject more than five reminders", () => {
    expect(rulesFormSchema.safeParse({ ...baseRules, reminderDays: "1, 2, 3, 4, 5, 6" }).success).toBe(false);
  });

  it("should reject reminder days outside 1 to 60", () => {
    expect(rulesFormSchema.safeParse({ ...baseRules, reminderDays: "0" }).success).toBe(false);
    expect(rulesFormSchema.safeParse({ ...baseRules, reminderDays: "61" }).success).toBe(false);
  });

  it("should reject a reminder line that is not whole numbers", () => {
    expect(rulesFormSchema.safeParse({ ...baseRules, reminderDays: "3, abc" }).success).toBe(false);
    expect(rulesFormSchema.safeParse({ ...baseRules, reminderDays: "2.5" }).success).toBe(false);
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
