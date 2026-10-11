import { describe, expect, it } from "vitest";

import { parseClientContext, parseThread } from "./view-schema";

const ID = "7c0c4d6e-2f3a-4b5c-8d9e-0a1b2c3d4e5f";

describe("parseClientContext", () => {
  it("should read the client id and the digest minutes", () => {
    expect(parseClientContext({ clientId: ID, digestMinutes: 15 })).toEqual({
      clientId: ID,
      digestMinutes: 15,
    });
  });

  it("should reject a payload without the client id", () => {
    expect(() => parseClientContext({ digestMinutes: 15 })).toThrow();
  });
});

describe("parseThread for a client user", () => {
  it("should accept messages without internal and mentions and a null mentionable list", () => {
    const thread = parseThread({
      client: { id: ID, name: "Πελάτης", managerName: null, status: "active" },
      partial: false,
      canWrite: true,
      canWriteUntagged: true,
      productions: [{ id: ID, title: "Reel", state: "open" }],
      mentionable: null,
      readAt: null,
      editMinutes: 15,
      messages: [
        {
          id: ID,
          at: "2026-10-12T10:00:00Z",
          authorId: ID,
          authorName: "Κώστας",
          authorKind: "client",
          mine: true,
          body: "Γεια",
          productionId: null,
          productionTitle: null,
          editedAt: null,
          deleted: false,
          canEdit: true,
          canDelete: true,
        },
      ],
    });
    expect(thread.messages[0]?.internal).toBeUndefined();
    expect(thread.mentionable).toBeNull();
  });
});
