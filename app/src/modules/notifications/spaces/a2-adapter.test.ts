import { describe, expect, it } from "vitest";

import type { Pref } from "../automation-view-schema";
import type { NotificationItem } from "../view-schema";
import { a2ItemsOf, a2PrefGroupsOf } from "./a2-adapter";

const NOW = new Date("2026-11-02T10:00:00Z");

const item = (overrides: Partial<NotificationItem> = {}): NotificationItem => ({
  id: "6f0c1d7a-0000-4000-8000-000000000001",
  title: "Νέο Μήνυμα από Κυψέλη Καφέ",
  body: "Καλημέρα!",
  link: "/app/messages/c-1",
  createdAt: "2026-11-02T09:55:00Z",
  isRead: false,
  ...overrides,
});

const pref = (overrides: Partial<Pref> = {}): Pref => ({
  automationId: "6f0c1d7a-0000-4000-8000-000000000010",
  eventType: "message.new",
  eventLabel: "Νέο Μήνυμα",
  channel: "notification",
  isEssential: false,
  canMute: true,
  receive: true,
  ...overrides,
});

describe("a2ItemsOf", () => {
  it("should show when and body under the title", () => {
    expect(a2ItemsOf([item()], NOW)[0]).toMatchObject({
      title: "Νέο Μήνυμα από Κυψέλη Καφέ",
      sub: "πριν από 5 λεπτά · Καλημέρα!",
      isRead: false,
    });
  });

  it("should show only when when there is no body", () => {
    expect(a2ItemsOf([item({ body: "" })], NOW)[0]?.sub).toBe(
      "πριν από 5 λεπτά",
    );
  });
});

describe("a2PrefGroupsOf", () => {
  it("should group by event and number repeated channels", () => {
    const groups = a2PrefGroupsOf([
      pref(),
      pref({ automationId: "a-2", channel: "email" }),
      pref({ automationId: "a-3", channel: "email" }),
      pref({
        automationId: "a-4",
        eventLabel: "Νέο Τιμολόγιο",
        canMute: false,
      }),
    ]);
    expect(groups.map((group) => group.label)).toEqual([
      "Νέο Μήνυμα",
      "Νέο Τιμολόγιο",
    ]);
    expect(groups[0]?.rows.map((row) => row.name)).toEqual([
      "Νέο Μήνυμα · Ειδοποίηση",
      "Νέο Μήνυμα · Email",
      "Νέο Μήνυμα · Email 2",
    ]);
    expect(groups[1]?.rows[0]).toMatchObject({
      channel: "Ειδοποίηση",
      canMute: false,
    });
  });
});
