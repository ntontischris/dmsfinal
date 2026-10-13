import { describe, expect, it } from "vitest";

import { coverSchema, ignoreSchema, reopenSchema } from "./assistant-schemas";
import {
  parseConversation,
  parseOpenCount,
  parseUnansweredList,
} from "./assistant-view-schema";

const ID = "11111111-1111-4111-8111-111111111111";
const ITEM = "22222222-2222-4222-8222-222222222222";

describe("assistant form schemas", () => {
  it("should require a knowledge item to cover a question", () => {
    expect(coverSchema.parse({ id: ID, itemId: ITEM })).toEqual({
      id: ID,
      itemId: ITEM,
    });
    const missing = coverSchema.safeParse({ id: ID, itemId: "" });
    expect(missing.success).toBe(false);
    expect(missing.error?.issues[0]?.message).toBe(
      "Διάλεξε δημοσιευμένο στοιχείο της Γνώσης.",
    );
  });

  it("should accept only the three ignore reasons", () => {
    expect(ignoreSchema.parse({ id: ID, reason: "abuse" }).reason).toBe(
      "abuse",
    );
    const wrong = ignoreSchema.safeParse({ id: ID, reason: "boring" });
    expect(wrong.error?.issues[0]?.message).toBe("Διάλεξε λόγο.");
  });

  it("should reject a non-uuid id", () => {
    expect(reopenSchema.safeParse({ id: "x" }).success).toBe(false);
  });
});

describe("assistant view schemas", () => {
  it("should parse a conversation with a gone source", () => {
    const conversation = parseConversation({
      id: ID,
      audience: "public",
      who: null,
      clientName: null,
      language: "el",
      startedAt: "2026-10-13T10:00:00+00:00",
      lastMessageAt: "2026-10-13T10:01:00+00:00",
      messages: [
        {
          id: ITEM,
          role: "assistant",
          content: "Δείτε:",
          noSource: false,
          createdAt: "2026-10-13T10:01:00+00:00",
          sources: [{ kind: "item", id: ITEM, title: "Τιμές", gone: true }],
        },
      ],
    });
    expect(conversation.messages[0]?.sources[0]?.gone).toBe(true);
  });

  it("should reject an unknown status loudly", () => {
    expect(() =>
      parseUnansweredList({
        counts: { open: 0, covered: 0, ignored: 0 },
        items: [{ id: ID, status: "maybe" }],
      }),
    ).toThrow();
  });

  it("should parse the open count as an integer", () => {
    expect(parseOpenCount(3)).toBe(3);
    expect(() => parseOpenCount("3")).toThrow();
  });
});
