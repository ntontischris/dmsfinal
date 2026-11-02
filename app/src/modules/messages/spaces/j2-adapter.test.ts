import { describe, expect, it } from "vitest";

import type { MessageRequest, Thread, ThreadMessage } from "../view-schema";
import {
  j2ChipsOf,
  j2DefaultTag,
  j2MessageOf,
  j2RequestOf,
  j2SideOf,
  mentionsIn,
} from "./j2-adapter";

const NOW = new Date("2026-11-02T10:00:00Z");

const message = (overrides: Partial<ThreadMessage> = {}): ThreadMessage => ({
  id: "m-1",
  at: "2026-11-02T09:55:00Z",
  authorId: "u-1",
  authorName: "Μαρία (Κυψέλη)",
  authorKind: "client",
  mine: false,
  body: "Θέλουμε ένα reel",
  productionId: "p-1",
  productionTitle: "Social Νοέμβριος",
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

const thread = (overrides: Partial<Thread> = {}): Thread => ({
  client: {
    id: "c-1",
    name: "Κυψέλη Καφέ",
    managerName: "Άννα",
    status: "active",
  },
  partial: false,
  canWrite: true,
  canWriteUntagged: true,
  productions: [{ id: "p-1", title: "Social Νοέμβριος", state: "active" }],
  mentionable: [],
  assignable: [],
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
  assigneeName: "Άννα",
  daysOpen: 1,
  canHandle: true,
  canReassign: false,
  ...overrides,
});

describe("j2MessageOf", () => {
  it("should let the team mark a client message as a request when it can write its tag", () => {
    const view = j2MessageOf(thread(), message(), NOW);
    expect(view).toMatchObject({
      side: "client",
      anchor: "m-m-1",
      canMark: true,
      canBeNew: true,
      tagHref: "/app/messages/c-1?production=p-1",
    });
  });

  it("should not offer marking when the tag is not writable", () => {
    const view = j2MessageOf(thread({ productions: [] }), message(), NOW);
    expect(view.canMark).toBe(false);
  });

  it("should show the remaining edit minutes on own messages", () => {
    const view = j2MessageOf(
      thread(),
      message({
        authorKind: "team",
        mine: true,
        canEdit: true,
        at: "2026-11-02T09:50:00Z",
      }),
      NOW,
    );
    expect(view.editMinutesLeft).toBe(5);
    expect(view.canBeNew).toBe(false);
  });

  it("should hide body actions and attachments of a deleted message", () => {
    const view = j2MessageOf(
      thread(),
      message({
        deleted: true,
        canDelete: true,
        attachments: [
          { id: "a-1", name: "menu.pdf", mime: "application/pdf", size: 2048 },
        ],
      }),
      NOW,
    );
    expect(view).toMatchObject({
      isDeleted: true,
      canDelete: false,
      canMark: false,
      attachments: [],
    });
  });

  it("should link attachments through the visibility-checked route", () => {
    const view = j2MessageOf(
      thread(),
      message({
        attachments: [
          { id: "a-1", name: "menu.pdf", mime: "application/pdf", size: 2048 },
        ],
      }),
      NOW,
    );
    expect(view.attachments[0]).toEqual({
      id: "a-1",
      name: "menu.pdf",
      href: "/app/messages/attachments/a-1",
      size: "2 KB",
    });
  });
});

describe("j2RequestOf", () => {
  it("should describe an open request with assignee and days", () => {
    expect(j2RequestOf(request())).toMatchObject({
      title: "Αίτημα: Νέο Παραδοτέο",
      state: "ανοιχτό",
      assignee: "Ανατέθηκε: Άννα",
      daysOpen: "ανοιχτό 1 μέρα",
      canHandle: true,
    });
  });

  it("should not allow handling a closed request", () => {
    expect(
      j2RequestOf(request({ state: "done", canHandle: true })).canHandle,
    ).toBe(false);
  });
});

describe("j2ChipsOf", () => {
  it("should hide the untagged chip in a partial view and mark the active tag", () => {
    const chips = j2ChipsOf(
      "c-1",
      [{ id: "p-1", title: "Social" }],
      { filter: "all", production: "p-1" },
      true,
    );
    expect(chips.map((chip) => chip.key)).toEqual(["all", "p-1", "internal"]);
    expect(chips.find((chip) => chip.isCurrent)?.key).toBe("p-1");
  });
});

describe("j2SideOf", () => {
  it("should title each request by kind and text", () => {
    const [row] = j2SideOf([
      {
        key: "m-1",
        kind: "filming",
        state: "open",
        text: "Γύρισμα στο μαγαζί",
        assigneeName: null,
        daysOpen: 2,
        href: "#m-m-1",
      },
    ]);
    expect(row).toMatchObject({
      title: "Γύρισμα: Γύρισμα στο μαγαζί",
      sub: "Χωρίς υπεύθυνο · ανοιχτό 2 μέρες",
      isOpen: true,
    });
  });
});

describe("j2DefaultTag", () => {
  const productions = [{ id: "p-1", title: "A", state: "active" }];
  it("should prefer the filtered production, else untagged, else the first", () => {
    expect(j2DefaultTag(productions, true, "p-1")).toBe("p-1");
    expect(j2DefaultTag(productions, true, "p-x")).toBe("");
    expect(j2DefaultTag(productions, false, undefined)).toBe("p-1");
  });
});

describe("mentionsIn", () => {
  it("should keep only picked people whose @name stayed in the text", () => {
    const people = [
      { id: "u-1", name: "Άννα" },
      { id: "u-2", name: "Νίκος" },
    ];
    expect(mentionsIn("@Άννα δες το", ["u-1", "u-2"], people)).toEqual(["u-1"]);
  });
});
