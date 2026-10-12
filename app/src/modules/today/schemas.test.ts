import { describe, expect, it } from "vitest";

import { moved, toggled } from "./customize-model";
import { prefsSchema } from "./schemas";
import { parseCardData, parseTodayCounts } from "./view-schema";

describe("prefsSchema", () => {
  it("should accept card codes", () => {
    expect(prefsSchema.safeParse({ order: ["health", "readiness"], hidden: [] }).success).toBe(true);
  });

  it("should reject a malformed code", () => {
    expect(prefsSchema.safeParse({ order: ["Health; drop"], hidden: [] }).success).toBe(false);
  });

  it("should reject too many codes", () => {
    const order = Array.from({ length: 101 }, (_, index) => `c${index}`);
    expect(prefsSchema.safeParse({ order, hidden: [] }).success).toBe(false);
  });
});

describe("view schemas", () => {
  const counts = {
    cards: [
      { code: "health", grp: "health", kind: "health", label: "Υγεία συστήματος",
        link: "/app/settings/sends?tab=failed", count: 0, failed: false, hidden: false },
    ],
    unread_notifications: 3,
    customized: true,
  };

  it("should turn the counts into camelCase", () => {
    const parsed = parseTodayCounts(counts);
    expect(parsed.unreadNotifications).toBe(3);
    expect(parsed.isCustomized).toBe(true);
  });

  it("should reject a card link outside the app", () => {
    const bad = { ...counts, cards: [{ ...counts.cards[0], link: "https://evil.example.com" }] };
    expect(() => parseTodayCounts(bad)).toThrow();
  });

  it("should read card items with an optional amount", () => {
    const data = parseCardData({
      code: "health",
      count: 1,
      items: [{ id: "job:outbox", title: "Δεν έτρεξε", subtitle: null, at: null, urgent: true, link: "/app/settings/sends" }],
    });
    expect(data.items[0]).toMatchObject({ amountCents: null, urgent: true });
  });
});

describe("customize model", () => {
  it("should move a card one step without touching the others", () => {
    expect(moved(["a", "b", "c"], "c", -1)).toEqual(["a", "c", "b"]);
    expect(moved(["a", "b"], "a", -1)).toEqual(["a", "b"]);
  });

  it("should toggle a hidden card", () => {
    expect(toggled(["a"], "a")).toEqual([]);
    expect(toggled([], "a")).toEqual(["a"]);
  });
});
