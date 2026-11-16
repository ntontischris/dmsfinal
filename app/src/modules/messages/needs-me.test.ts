import { describe, expect, it } from "vitest";

import {
  needKindLabel,
  needsMeOf,
  waitLabel,
  waitingSinceOf,
} from "./needs-me";
import type { InboxItem, QueueItem } from "./view-schema";

const inboxItem = (overrides: Partial<InboxItem> = {}): InboxItem => ({
  clientId: "c-1",
  clientName: "Κυψέλη",
  lastAt: "2026-11-10T09:00:00Z",
  preview: "γεια",
  lastInternal: false,
  lastDeleted: false,
  unread: 0,
  partial: false,
  waitingSince: null,
  mentionSince: null,
  ...overrides,
});

const request = (overrides: Partial<QueueItem> = {}): QueueItem => ({
  messageId: "m-1",
  deliverableId: null,
  clientId: "c-1",
  clientName: "Κυψέλη",
  productionTitle: null,
  kind: "deliverable",
  state: "open",
  assigneeName: null,
  daysOpen: 1,
  stale: false,
  text: "θέλω reel",
  at: "2026-11-10T08:00:00Z",
  closed: null,
  ...overrides,
});

describe("needsMeOf", () => {
  it("should list only clients that need me, oldest first", () => {
    const rows = needsMeOf(
      [
        inboxItem({
          clientId: "a",
          clientName: "Α",
          waitingSince: "2026-11-10T10:00:00Z",
        }),
        inboxItem({ clientId: "b", clientName: "Β" }),
        inboxItem({
          clientId: "c",
          clientName: "Γ",
          mentionSince: "2026-11-09T10:00:00Z",
        }),
      ],
      [],
    );
    expect(rows.map((row) => [row.who, row.kind])).toEqual([
      ["Γ", "mention"],
      ["Α", "reply"],
    ]);
  });

  it("should show one row per client and prefer the open request", () => {
    const rows = needsMeOf(
      [inboxItem({ waitingSince: "2026-11-09T07:00:00Z" })],
      [request(), request({ messageId: "m-2", at: "2026-11-10T09:00:00Z" })],
    );
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({
      kind: "request",
      href: "/app/messages/c-1#m-m-1",
      since: "2026-11-09T07:00:00Z",
    });
  });

  it("should leave out after-approval changes and closed requests", () => {
    expect(
      needsMeOf([], [request({ kind: "change" }), request({ state: "done" })]),
    ).toEqual([]);
  });
});

describe("waitingSinceOf", () => {
  it("should fall back to unread client messages when the database has no field yet", () => {
    const item = inboxItem({ waitingSince: undefined, unread: 1 });
    expect(waitingSinceOf(item)).toBe(item.lastAt);
    expect(waitingSinceOf({ ...item, lastInternal: true })).toBeNull();
  });
});

describe("waitLabel", () => {
  const now = new Date("2026-11-10T12:00:00Z");

  it("should say how long in plain words", () => {
    expect(waitLabel("2026-11-10T09:00:00Z", now)).toBe("περιμένει 3 ώρες");
    expect(waitLabel("2026-11-09T12:00:00Z", now)).toBe("περιμένει 1 μέρα");
    expect(waitLabel("2026-11-10T11:59:30Z", now)).toBe("περιμένει λίγο");
  });

  it("should name each kind", () => {
    expect(needKindLabel("reply")).toBe("Περιμένει απάντηση");
  });
});
