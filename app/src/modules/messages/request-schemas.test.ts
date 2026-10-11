import { describe, expect, it } from "vitest";

import {
  assignRequestSchema,
  closeDoneSchema,
  closeRejectedSchema,
  deliverableFromRequestSchema,
  markRequestSchema,
} from "./request-schemas";
import { sendSchema } from "./schemas";

const ID = "7c0c4d6e-2f3a-4b5c-8d9e-0a1b2c3d4e5f";
const KIND = "9f8e7d6c-5b4a-4321-8fed-cba987654321";

describe("markRequestSchema", () => {
  it("should accept the three kinds a conversation can declare", () => {
    for (const kind of ["deliverable", "filming", "other"]) {
      expect(markRequestSchema.safeParse({ id: ID, kind }).success).toBe(true);
    }
  });
  it("should refuse the change-after-approval kind", () => {
    expect(
      markRequestSchema.safeParse({ id: ID, kind: "change" }).success,
    ).toBe(false);
  });
  it("should refuse an empty kind", () => {
    expect(markRequestSchema.safeParse({ id: ID, kind: "" }).success).toBe(
      false,
    );
  });
});

describe("assignRequestSchema", () => {
  it("should turn an empty user into null (Χωρίς υπεύθυνο)", () => {
    expect(assignRequestSchema.parse({ id: ID, userId: "" }).userId).toBeNull();
  });
  it("should keep a user id", () => {
    expect(assignRequestSchema.parse({ id: ID, userId: KIND }).userId).toBe(
      KIND,
    );
  });
});

describe("closeDoneSchema", () => {
  it("should accept a link only", () => {
    expect(
      closeDoneSchema.safeParse({
        id: ID,
        link: "https://example.com/a",
        comment: "",
      }).success,
    ).toBe(true);
  });
  it("should accept a comment only", () => {
    expect(
      closeDoneSchema.safeParse({ id: ID, link: "", comment: "Έτοιμο" })
        .success,
    ).toBe(true);
  });
  it("should need a link or a comment", () => {
    const result = closeDoneSchema.safeParse({
      id: ID,
      link: "",
      comment: "  ",
    });
    expect(result.success).toBe(false);
    expect(result.error?.issues[0]?.message).toBe(
      "Χρειάζεται τουλάχιστον ένα: σύνδεσμος ή σχόλιο.",
    );
  });
  it("should refuse links that are not https", () => {
    expect(
      closeDoneSchema.safeParse({
        id: ID,
        link: "javascript:alert(1)",
        comment: "",
      }).success,
    ).toBe(false);
    expect(
      closeDoneSchema.safeParse({
        id: ID,
        link: "http://example.com",
        comment: "",
      }).success,
    ).toBe(false);
  });
  it("should refuse a comment with an http link", () => {
    expect(
      closeDoneSchema.safeParse({
        id: ID,
        link: "",
        comment: "δες http://x.gr",
      }).success,
    ).toBe(false);
  });
});

describe("closeRejectedSchema", () => {
  it("should need a reply", () => {
    const result = closeRejectedSchema.safeParse({ id: ID, reply: "   " });
    expect(result.success).toBe(false);
    expect(result.error?.issues[0]?.message).toBe(
      "Η απόρριψη θέλει απάντηση προς τον πελάτη.",
    );
  });
  it("should accept a reply", () => {
    expect(
      closeRejectedSchema.parse({ id: ID, reply: "Δεν γίνεται" }).reply,
    ).toBe("Δεν γίνεται");
  });
  it("should refuse a reply longer than 2.000 characters", () => {
    expect(
      closeRejectedSchema.safeParse({ id: ID, reply: "α".repeat(2001) })
        .success,
    ).toBe(false);
  });
});

describe("deliverableFromRequestSchema", () => {
  const base = {
    id: ID,
    productionId: "",
    kindId: KIND,
    title: "Reel",
    assigneeId: "",
    filmingId: "",
    charge: "",
    chargeReason: "",
  };
  it("should accept the minimum fields", () => {
    const value = deliverableFromRequestSchema.parse(base);
    expect(value.productionId).toBeNull();
    expect(value.charge).toBeNull();
    expect(value.chargeReason).toBeNull();
  });
  it("should need a title", () => {
    expect(
      deliverableFromRequestSchema.safeParse({ ...base, title: "  " }).success,
    ).toBe(false);
  });
  it("should need a reason for no charge", () => {
    expect(
      deliverableFromRequestSchema.safeParse({ ...base, charge: "free" })
        .success,
    ).toBe(false);
    expect(
      deliverableFromRequestSchema.safeParse({
        ...base,
        charge: "free",
        chargeReason: "Δώρο",
      }).success,
    ).toBe(true);
  });
});

describe("sendSchema request kind", () => {
  const base = {
    clientId: ID,
    productionId: "",
    body: "Θέλω ένα reel",
    internal: false,
    mentions: [],
    attachments: [] as string[],
  };
  it("should send a plain message without a request", () => {
    expect(sendSchema.parse(base).requestKind).toBeNull();
    expect(
      sendSchema.parse({ ...base, requestKind: "" }).requestKind,
    ).toBeNull();
  });
  it("should carry a declared kind", () => {
    expect(
      sendSchema.parse({ ...base, requestKind: "filming" }).requestKind,
    ).toBe("filming");
  });
  it("should refuse the change kind", () => {
    expect(
      sendSchema.safeParse({ ...base, requestKind: "change" }).success,
    ).toBe(false);
  });
});
