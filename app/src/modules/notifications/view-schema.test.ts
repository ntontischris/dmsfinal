import { describe, expect, it } from "vitest";

import { parseBell, parseNotificationPage } from "./view-schema";

const ITEM = {
  id: "6f1c2a3e-4b5d-4e6f-8a7b-9c0d1e2f3a4b",
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

  it("should reject an item without a uuid", () => {
    expect(() =>
      parseBell({ unread: 0, latest: [{ ...ITEM, id: "n-01" }] }),
    ).toThrow();
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
