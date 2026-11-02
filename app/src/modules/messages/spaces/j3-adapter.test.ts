import { describe, expect, it } from "vitest";

import type {
  ClientRequest,
  MessageRequest,
  Thread,
  ThreadMessage,
} from "../view-schema";
import {
  j3ItemOf,
  j3RecipientOf,
  j3RequestOf,
  j3RequestRowsOf,
  j3SentNoticeOf,
} from "./j3-adapter";

const NOW = new Date("2026-11-02T10:00:00Z");

const message = (overrides: Partial<ThreadMessage> = {}): ThreadMessage => ({
  id: "m-1",
  at: "2026-11-02T09:55:00Z",
  authorId: "u-1",
  authorName: "Μαρία (Κυψέλη)",
  authorKind: "client",
  mine: true,
  body: "Θέλουμε ένα reel",
  productionId: "p-1",
  productionTitle: "Social Νοέμβριος",
  editedAt: null,
  deleted: false,
  canEdit: true,
  canDelete: true,
  attachments: [],
  request: null,
  ...overrides,
});

const thread = (overrides: Partial<Thread> = {}): Thread => ({
  client: {
    id: "c-1",
    name: "Κυψέλη Καφέ",
    managerName: null,
    status: "active",
  },
  partial: false,
  canWrite: true,
  canWriteUntagged: true,
  productions: [{ id: "p-1", title: "Social Νοέμβριος", state: "active" }],
  mentionable: null,
  assignable: null,
  readAt: null,
  editMinutes: 15,
  changeRequests: [],
  messages: [],
  ...overrides,
});

const request = (overrides: Partial<MessageRequest> = {}): MessageRequest => ({
  kind: "deliverable",
  state: "open",
  declaredBy: "client",
  declaredAt: "2026-11-01T09:00:00Z",
  closedAt: null,
  link: null,
  comment: null,
  reply: null,
  automatic: false,
  resultKind: null,
  resultId: null,
  ...overrides,
});

const clientRequest = (
  overrides: Partial<ClientRequest> = {},
): ClientRequest => ({
  messageId: "m-1",
  deliverableId: null,
  deliverableTitle: null,
  kind: "deliverable",
  state: "open",
  at: "2026-11-01T09:00:00Z",
  text: "Ένα reel",
  link: null,
  comment: null,
  reply: null,
  automatic: false,
  resultKind: null,
  resultId: null,
  decision: null,
  ...overrides,
});

describe("j3ItemOf", () => {
  it("should hide team actions and the tag link from the client", () => {
    const item = j3ItemOf(thread(), message(), NOW);
    expect(item.isOwn).toBe(true);
    expect(item.message).toMatchObject({
      tagHref: null,
      canTag: false,
      canMark: false,
      canEdit: true,
      canDelete: true,
    });
  });

  it("should show the request of a message that is not deleted", () => {
    const item = j3ItemOf(thread(), message({ request: request() }), NOW);
    expect(item.request).toMatchObject({
      title: "Αίτημα · Νέο Παραδοτέο",
      state: "ανοιχτό",
      isOpen: true,
    });
    expect(
      j3ItemOf(thread(), message({ deleted: true, request: request() }), NOW)
        .request,
    ).toBeNull();
  });
});

describe("j3RequestOf", () => {
  it("should link the created deliverable and keep the comment when done", () => {
    const view = j3RequestOf(
      request({
        state: "done",
        closedAt: "2026-11-02T08:00:00Z",
        comment: "Έτοιμο",
        resultKind: "deliverable",
        resultId: "d-1",
      }),
      NOW,
    );
    expect(view.links).toEqual([
      expect.objectContaining({
        href: "/app/deliverables/d-1",
        isExternal: false,
      }),
    ]);
    expect(view.comment).toBe("Έτοιμο");
    expect(view.closedWhen).not.toBeNull();
  });

  it("should never link a filming for the client", () => {
    const view = j3RequestOf(
      request({
        kind: "filming",
        state: "done",
        resultKind: "filming",
        resultId: "f-1",
      }),
      NOW,
    );
    expect(view.links).toEqual([]);
  });

  it("should show only the team reply when rejected", () => {
    const view = j3RequestOf(
      request({
        state: "rejected",
        reply: "Δεν γίνεται",
        comment: "εσωτερικό",
      }),
      NOW,
    );
    expect(view).toMatchObject({
      reply: "Δεν γίνεται",
      comment: null,
      links: [],
    });
  });
});

describe("j3RequestRowsOf", () => {
  it("should put open requests first and link a change to its deliverable", () => {
    const rows = j3RequestRowsOf(
      [
        clientRequest({
          messageId: "m-old",
          state: "done",
          at: "2026-11-02T09:00:00Z",
        }),
        clientRequest({
          messageId: null,
          kind: "change",
          deliverableId: "d-9",
          deliverableTitle: "Reel 1",
        }),
      ],
      NOW,
    );
    expect(rows.map((row) => row.title)).toEqual([
      "Αλλαγή μετά την έγκριση",
      "Νέο Παραδοτέο",
    ]);
    expect(rows[0]).toMatchObject({
      about: "Reel 1",
      chatHref: null,
      deliverable: { href: "/app/deliverables/d-9" },
    });
    expect(rows[1]).toMatchObject({
      isFaded: true,
      chatHref: "/app/messages#m-m-old",
    });
  });

  it("should not repeat the deliverable link already shown in the box", () => {
    const [row] = j3RequestRowsOf(
      [
        clientRequest({
          state: "done",
          resultKind: "deliverable",
          resultId: "d-1",
        }),
      ],
      NOW,
    );
    expect(row?.deliverable).toBeNull();
    expect(row?.box.links).toHaveLength(1);
  });
});

describe("j3RecipientOf and j3SentNoticeOf", () => {
  it("should name the client manager when known", () => {
    expect(j3RecipientOf("Άννα")).toBe("Άννα και η ομάδα της Devre Media");
    expect(j3RecipientOf(null)).toBe("η ομάδα της Devre Media");
  });

  it("should say what was sent", () => {
    expect(j3SentNoticeOf(true, "Άννα")).toContain("Το Αίτημα στάλθηκε");
    expect(j3SentNoticeOf(false, "Άννα")).toContain("Το μήνυμα στάλθηκε");
  });
});
