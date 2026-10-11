import { describe, expect, it } from "vitest";

import { sideRequestsOf, timelineOf } from "./request-helpers";
import type { ChangeRequest, MessageRequest, ThreadMessage } from "./view-schema";

const DELIVERABLE = "d1d1d1d1-0000-4000-8000-000000000001";

const openRequest: MessageRequest = {
  kind: "deliverable",
  state: "open",
  declaredBy: "client",
  declaredAt: "2026-10-12T08:00:00Z",
  closedAt: null,
  link: null,
  comment: null,
  reply: null,
  automatic: false,
  resultKind: null,
  resultId: null,
  assigneeName: "Άννα",
  daysOpen: 2,
};

const message = (
  id: string,
  at: string,
  patch: Partial<ThreadMessage> = {},
): ThreadMessage => ({
  id,
  at,
  authorId: "u1",
  authorName: "Κώστας",
  authorKind: "client",
  mine: false,
  body: "Γεια",
  productionId: null,
  productionTitle: null,
  editedAt: null,
  deleted: false,
  canEdit: false,
  canDelete: false,
  attachments: [],
  request: null,
  ...patch,
});

const change = (
  id: string,
  at: string,
  state: ChangeRequest["state"] = "open",
): ChangeRequest => ({
  id,
  at,
  deliverableId: DELIVERABLE,
  deliverableTitle: "Reel",
  body: "Άλλη μουσική",
  state,
  decision: null,
});

describe("timelineOf", () => {
  it("should place a change request at its time between messages", () => {
    const entries = timelineOf(
      [
        message("m1", "2026-10-12T08:00:00Z"),
        message("m2", "2026-10-12T12:00:00Z"),
      ],
      [change("c1", "2026-10-12T10:00:00Z")],
    );
    expect(entries.map((entry) => entry.type)).toEqual([
      "message",
      "change",
      "message",
    ]);
  });
  it("should put the message first on a tie", () => {
    const entries = timelineOf(
      [message("m1", "2026-10-12T08:00:00Z")],
      [change("c1", "2026-10-12T08:00:00Z")],
    );
    expect(entries.map((entry) => entry.type)).toEqual(["message", "change"]);
  });
});

describe("sideRequestsOf", () => {
  const open = message("m1", "2026-10-12T08:00:00Z", {
    body: "Θέλω reel",
    request: openRequest,
  });
  const done = message("m2", "2026-10-11T08:00:00Z", {
    request: {
      ...openRequest,
      state: "done",
      closedAt: "2026-10-11T09:00:00Z",
      comment: "ok",
    },
  });

  it("should list only messages that are requests, open first", () => {
    const items = sideRequestsOf(
      [message("m0", "2026-10-10T08:00:00Z"), done, open],
      [change("c1", "2026-10-12T09:00:00Z")],
    );
    expect(items.map((item) => item.key)).toEqual(["m1", "c1", "m2"]);
  });
  it("should carry the assignee and the days for an open request", () => {
    const [first] = sideRequestsOf([open], []);
    expect(first?.assigneeName).toBe("Άννα");
    expect(first?.daysOpen).toBe(2);
    expect(first?.href).toBe("#m-m1");
  });
  it("should link a change request to its deliverable", () => {
    expect(
      sideRequestsOf([], [change("c1", "2026-10-12T09:00:00Z")])[0]?.href,
    ).toBe(`/app/deliverables/${DELIVERABLE}`);
  });
  it("should skip deleted messages", () => {
    expect(sideRequestsOf([{ ...open, deleted: true }], [])).toEqual([]);
  });
});
