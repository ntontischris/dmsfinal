import { describe, expect, it } from "vitest";

import {
  cancelSchema,
  chargeDecisionSchema,
  commentSchema,
  createSchema,
  versionAddSchema,
} from "./schemas";

const DELIVERABLE_ID = "11111111-1111-4111-8111-111111111111";
const PRODUCTION_ID = "22222222-2222-4222-8222-222222222222";
const KIND_ID = "33333333-3333-4333-8333-333333333333";

const messageOf = (result: { success: boolean; error?: { issues: { message: string }[] } }) =>
  result.success ? null : result.error?.issues[0]?.message;

describe("createSchema", () => {
  const base = { productionId: PRODUCTION_ID, kindId: KIND_ID, title: "Reel Μαρτίου" };

  it("should create a deliverable that draws from the balance with empty charge fields", () => {
    const parsed = createSchema.safeParse({ ...base, assigneeId: "", filmingId: "", charge: "", chargeReason: "" });
    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data.charge).toBeNull();
      expect(parsed.data.assigneeId).toBeNull();
      expect(parsed.data.chargeReason).toBeNull();
    }
  });

  it("should ask for a reason when the charge is free", () => {
    const result = createSchema.safeParse({ ...base, charge: "free", chargeReason: "" });
    expect(messageOf(result)).toBe("Η χωρίς χρέωση θέλει λόγο.");
  });

  it("should refuse an empty title", () => {
    const result = createSchema.safeParse({ ...base, title: "   " });
    expect(messageOf(result)).toBe("Γράψε τίτλο για το Παραδοτέο.");
  });
});

describe("versionAddSchema", () => {
  it("should accept a Drive link and refuse a link from another platform", () => {
    expect(
      versionAddSchema.safeParse({ deliverableId: DELIVERABLE_ID, url: "https://drive.google.com/file/d/x" }).success,
    ).toBe(true);
    const result = versionAddSchema.safeParse({ deliverableId: DELIVERABLE_ID, url: "https://example.com/x" });
    expect(messageOf(result)).toBe("Το link δεν είναι από επιτρεπτή πλατφόρμα.");
  });
});

describe("commentSchema", () => {
  const base = { deliverableId: DELIVERABLE_ID, versionNumber: "2", body: "Ο ήχος στο 1:15" };

  it("should turn a typed mm:ss time into seconds", () => {
    const parsed = commentSchema.safeParse({ ...base, atSeconds: "0:42", isInternal: "1" });
    expect(parsed.success && parsed.data.atSeconds).toBe(42);
    expect(parsed.success && parsed.data.isInternal).toBe(true);
    expect(parsed.success && parsed.data.versionNumber).toBe(2);
  });

  it("should accept a comment with no time", () => {
    const parsed = commentSchema.safeParse({ ...base, atSeconds: "" });
    expect(parsed.success && parsed.data.atSeconds).toBeNull();
  });

  it("should refuse a time that is not mm:ss", () => {
    const result = commentSchema.safeParse({ ...base, atSeconds: "42" });
    expect(messageOf(result)).toBe("Ο χρόνος γράφεται ως mm:ss, π.χ. 0:12.");
  });
});

describe("cancelSchema", () => {
  it("should ask for the choice of the balance when the outcome is missing", () => {
    const result = cancelSchema.safeParse({ deliverableId: DELIVERABLE_ID, reason: "Αλλαγή", outcome: "" });
    expect(messageOf(result)).toBe("Διάλεξε «Η Παροχή καταναλώθηκε» ή «Επιστρέφει στην Περίοδο».");
  });
});

describe("chargeDecisionSchema", () => {
  it("should ask for a reason when the decision is no charge", () => {
    const result = chargeDecisionSchema.safeParse({ deliverableId: DELIVERABLE_ID, charge: "free", reason: "" });
    expect(messageOf(result)).toBe("Γράψε λόγο.");
  });

  it("should accept a charge without a reason", () => {
    expect(chargeDecisionSchema.safeParse({ deliverableId: DELIVERABLE_ID, charge: "charged" }).success).toBe(true);
  });
});
