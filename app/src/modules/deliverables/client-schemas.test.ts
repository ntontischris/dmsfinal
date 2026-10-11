import { describe, expect, it } from "vitest";

import { answerSchema, clientCommentSchema, requestChangeSchema } from "./client-schemas";

const DELIVERABLE_ID = "11111111-1111-4111-8111-111111111111";

describe("answerSchema", () => {
  it("should refuse «ζήτησε αλλαγές» without a note", () => {
    const parsed = answerSchema.safeParse({ deliverableId: DELIVERABLE_ID, decision: "changes", note: "" });
    expect(parsed.success).toBe(false);
  });

  it("should accept «ζήτησε αλλαγές» with a note", () => {
    const parsed = answerSchema.safeParse({ deliverableId: DELIVERABLE_ID, decision: "changes", note: "Κόψε το τέλος" });
    expect(parsed.success).toBe(true);
  });

  it("should refuse approval until the client confirms it is final", () => {
    const parsed = answerSchema.safeParse({ deliverableId: DELIVERABLE_ID, decision: "approve", note: "" });
    expect(parsed.success).toBe(false);
  });

  it("should accept approval with the confirmation", () => {
    const parsed = answerSchema.safeParse({
      deliverableId: DELIVERABLE_ID,
      decision: "approve",
      note: "",
      confirmFinal: "1",
    });
    expect(parsed.success).toBe(true);
  });
});

describe("clientCommentSchema", () => {
  it("should turn a mm:ss time into seconds", () => {
    const parsed = clientCommentSchema.parse({
      deliverableId: DELIVERABLE_ID,
      versionNumber: "2",
      body: "Ωραίο",
      atSeconds: "0:42",
    });
    expect(parsed).toMatchObject({ versionNumber: 2, atSeconds: 42 });
  });

  it("should refuse a time that is not mm:ss", () => {
    const parsed = clientCommentSchema.safeParse({
      deliverableId: DELIVERABLE_ID,
      versionNumber: 2,
      body: "Ωραίο",
      atSeconds: "42 δευτερόλεπτα",
    });
    expect(parsed.success).toBe(false);
  });
});

describe("requestChangeSchema", () => {
  it("should refuse an empty request", () => {
    expect(requestChangeSchema.safeParse({ deliverableId: DELIVERABLE_ID, body: "   " }).success).toBe(false);
  });
});
