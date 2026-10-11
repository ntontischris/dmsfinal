import { describe, expect, it } from "vitest";

import {
  parseClientContext,
  parseClientRequests,
  parseRequestsView,
  parseThread,
} from "./view-schema";

const ID = "7c0c4d6e-2f3a-4b5c-8d9e-0a1b2c3d4e5f";

describe("parseClientContext", () => {
  it("should read the client id and the digest minutes", () => {
    expect(
      parseClientContext({
        clientId: ID,
        canWrite: true,
        editMinutes: 15,
        digestMinutes: 15,
      }),
    ).toEqual({
      clientId: ID,
      canWrite: true,
      editMinutes: 15,
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
      assignable: null,
      readAt: null,
      editMinutes: 15,
      changeRequests: [],
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
          attachments: [],
          request: {
            kind: "other",
            state: "open",
            declaredBy: "client",
            declaredAt: "2026-10-12T10:00:00Z",
            closedAt: null,
            link: null,
            comment: null,
            reply: null,
            automatic: false,
            resultKind: null,
            resultId: null,
          },
        },
      ],
    });
    expect(thread.messages[0]?.internal).toBeUndefined();
    expect(thread.messages[0]?.request?.assigneeId).toBeUndefined();
    expect(thread.mentionable).toBeNull();
  });
});

const queueItem = {
  messageId: ID,
  deliverableId: null,
  clientId: ID,
  clientName: "Πελάτης",
  productionTitle: null,
  kind: "other",
  state: "open",
  assigneeName: null,
  daysOpen: 4,
  stale: true,
  text: "Θέλω ένα reel",
  at: "2026-10-12T10:00:00Z",
  closed: null,
};

describe("parseRequestsView", () => {
  it("should read the queue with the counters and the solo flag", () => {
    const view = parseRequestsView({
      items: [queueItem, { ...queueItem, messageId: null, deliverableId: ID, kind: "change" }],
      counts: { mine: 1, unassigned: 0 },
      solo: false,
    });
    expect(view.items).toHaveLength(2);
    expect(view.items[1]?.kind).toBe("change");
    expect(view.counts.mine).toBe(1);
  });

  it("should reject an unknown request kind", () => {
    expect(() =>
      parseRequestsView({ items: [{ ...queueItem, kind: "bogus" }], counts: { mine: 0, unassigned: 0 }, solo: true }),
    ).toThrow();
  });
});

describe("parseClientRequests", () => {
  it("should read the client list without assignee or days", () => {
    const view = parseClientRequests({
      items: [
        {
          messageId: ID,
          deliverableId: null,
          deliverableTitle: null,
          kind: "other",
          state: "rejected",
          at: "2026-10-12T10:00:00Z",
          text: "Ζητώ κάτι",
          link: null,
          comment: null,
          reply: "Δεν γίνεται",
          automatic: false,
          resultKind: null,
          resultId: null,
          decision: null,
        },
      ],
      openCount: 0,
    });
    expect(view.items[0]?.reply).toBe("Δεν γίνεται");
  });
});
