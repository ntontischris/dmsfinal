import { describe, expect, it } from "vitest";

import { replySchema, resolveSchema, seenSchema } from "./note-schemas";

const NOTE_ID = "11111111-1111-4111-8111-111111111111";

describe("replySchema", () => {
  it("should keep the reply text trimmed and read the internal mark", () => {
    const parsed = replySchema.parse({ parentId: NOTE_ID, body: "  Έγινε  ", isInternal: "1" });
    expect(parsed).toEqual({ parentId: NOTE_ID, body: "Έγινε", isInternal: true });
  });

  it("should treat a missing internal mark as visible to the client", () => {
    expect(replySchema.parse({ parentId: NOTE_ID, body: "Έγινε" }).isInternal).toBe(false);
  });

  it("should refuse an empty or too long reply", () => {
    expect(replySchema.safeParse({ parentId: NOTE_ID, body: "   " }).success).toBe(false);
    expect(replySchema.safeParse({ parentId: NOTE_ID, body: "α".repeat(2001) }).success).toBe(false);
  });
});

describe("resolveSchema", () => {
  it("should read resolve and reopen", () => {
    expect(resolveSchema.parse({ commentId: NOTE_ID, resolved: "1" }).resolved).toBe(true);
    expect(resolveSchema.parse({ commentId: NOTE_ID, resolved: "0" }).resolved).toBe(false);
  });

  it("should refuse anything else", () => {
    expect(resolveSchema.safeParse({ commentId: NOTE_ID, resolved: "ίσως" }).success).toBe(false);
  });
});

describe("seenSchema", () => {
  it("should accept a real version and refuse version zero", () => {
    expect(seenSchema.safeParse({ deliverableId: NOTE_ID, versionNumber: 2 }).success).toBe(true);
    expect(seenSchema.safeParse({ deliverableId: NOTE_ID, versionNumber: 0 }).success).toBe(false);
  });
});
