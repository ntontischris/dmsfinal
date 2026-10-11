import { describe, expect, it } from "vitest";

import {
  formatReminderDays,
  kindRowSchema,
  rulesFormSchema,
} from "./rules-schemas";

const KIND_ID = "11111111-1111-4111-8111-111111111111";
const baseRules = { internalReview: true, changesDays: 2, reminderDays: "3, 7" };

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
    expect(rulesFormSchema.safeParse({ ...baseRules, changesDays: 0 }).success).toBe(true);
    expect(rulesFormSchema.safeParse({ ...baseRules, changesDays: 31 }).success).toBe(false);
  });
});

describe("kindRowSchema", () => {
  it("should accept a deadline with no revision limit", () => {
    const row = { id: KIND_ID, deadlineDays: 5, revisionLimit: null };
    expect(kindRowSchema.safeParse(row).success).toBe(true);
  });

  it("should reject a deadline above 90 working days", () => {
    const row = { id: KIND_ID, deadlineDays: 91, revisionLimit: 2 };
    expect(kindRowSchema.safeParse(row).success).toBe(false);
  });

  it("should reject a revision limit above 20", () => {
    const row = { id: KIND_ID, deadlineDays: 5, revisionLimit: 21 };
    expect(kindRowSchema.safeParse(row).success).toBe(false);
  });
});
