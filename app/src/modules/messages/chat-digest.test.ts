import { describe, expect, it } from "vitest";

import { chatDigestOf } from "./chat-digest";
import type { Thread, ThreadMessage } from "./view-schema";

const message = (overrides: Partial<ThreadMessage> = {}): ThreadMessage => ({
  id: "m-1",
  at: "2026-11-01T09:00:00Z",
  authorId: "u-1",
  authorName: "Μαρία",
  authorKind: "client",
  mine: false,
  body: "Γεια σας",
  productionId: null,
  productionTitle: null,
  internal: false,
  mentions: [],
  editedAt: null,
  deleted: false,
  canEdit: false,
  canDelete: false,
  attachments: [],
  request: null,
  ...overrides,
});

const thread = (messages: ThreadMessage[], readAt: string | null = null): Thread => ({
  client: { id: "c-1", name: "Κυψέλη", managerName: null, status: "active" },
  partial: false,
  canWrite: true,
  canWriteUntagged: true,
  productions: [],
  mentionable: [],
  assignable: [],
  readAt,
  editMinutes: 15,
  changeRequests: [],
  messages,
});

describe("chatDigestOf", () => {
  it("should report an empty conversation", () => {
    expect(chatDigestOf(thread([]))).toEqual({
      href: "/app/messages/c-1",
      messageCount: 0,
      unread: 0,
      lastAt: null,
      lastClientReply: null,
    });
  });

  it("should pick the newest visible client message as the last reply", () => {
    const digest = chatDigestOf(
      thread(
        [
          message({ id: "a", at: "2026-11-01T09:00:00Z", body: "πρώτο" }),
          message({ id: "b", at: "2026-11-02T09:00:00Z", body: "δεύτερο" }),
          message({ id: "c", at: "2026-11-03T09:00:00Z", deleted: true, body: null }),
          message({ id: "d", at: "2026-11-04T09:00:00Z", authorKind: "team", mine: true }),
        ],
        "2026-11-01T12:00:00Z",
      ),
    );
    expect(digest.lastClientReply).toEqual({
      authorName: "Μαρία",
      at: "2026-11-02T09:00:00Z",
      text: "δεύτερο",
      href: "/app/messages/c-1#m-b",
    });
    expect(digest.lastAt).toBe("2026-11-04T09:00:00Z");
    expect(digest.messageCount).toBe(4);
    expect(digest.unread).toBe(1);
  });
});
