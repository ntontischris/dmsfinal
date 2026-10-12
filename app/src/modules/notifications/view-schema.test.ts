import { describe, expect, it } from "vitest";

import { parseBell, parseNotificationPage } from "./view-schema";

const ITEM = {
  id: "00000000-0000-0000-0000-000000000001",
  title: "Νέο Μήνυμα",
  body: "Νέο Μήνυμα από Κώστας: καλημέρα",
  link: "/app/messages/00000000-0000-0000-0000-0000000000d1",
  createdAt: "2026-10-12T09:00:00+00:00",
  isRead: false,
};

describe("parseBell", () => {
  it("should read the unread count and the latest items", () => {
    expect(parseBell({ unread: 1, latest: [ITEM] })).toEqual({
      unread: 1,
      latest: [ITEM],
    });
  });

  it("should accept a notification without link", () => {
    expect(
      parseBell({ unread: 0, latest: [{ ...ITEM, link: null, isRead: true }] })
        .latest[0]?.link,
    ).toBeNull();
  });

  it("should reject a negative count or a missing field", () => {
    expect(() => parseBell({ unread: -1, latest: [] })).toThrow();
    expect(() =>
      parseBell({ unread: 0, latest: [{ ...ITEM, title: undefined }] }),
    ).toThrow();
  });
});

describe("parseNotificationPage", () => {
  it("should read items, hasMore and unread", () => {
    expect(
      parseNotificationPage({ items: [ITEM], hasMore: true, unread: 3 }),
    ).toEqual({
      items: [ITEM],
      hasMore: true,
      unread: 3,
    });
  });

  it("should reject a page without hasMore", () => {
    expect(() => parseNotificationPage({ items: [], unread: 0 })).toThrow();
  });
});
