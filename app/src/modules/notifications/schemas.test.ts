import { describe, expect, it } from "vitest";

import { languageSchema, unsubscribeTokenSchema } from "./schemas";

describe("languageSchema", () => {
  it("should accept el and en only", () => {
    expect(languageSchema.safeParse({ language: "en" }).success).toBe(true);
    expect(languageSchema.safeParse({ language: "de" }).success).toBe(false);
  });
});

describe("unsubscribeTokenSchema", () => {
  it("should accept 64 hex digits only", () => {
    expect(unsubscribeTokenSchema.safeParse("a".repeat(64)).success).toBe(true);
    expect(unsubscribeTokenSchema.safeParse("A".repeat(64)).success).toBe(false);
    expect(unsubscribeTokenSchema.safeParse("a".repeat(63)).success).toBe(false);
  });
});
