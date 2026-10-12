import { describe, expect, it } from "vitest";

import {
  badgeText,
  bellLabel,
  notificationsHref,
  parseBefore,
  parseFilter,
  relativeTime,
  safeLink,
} from "./helpers";

const NOW = new Date("2026-10-12T10:00:00Z");
const ago = (ms: number): string => new Date(NOW.getTime() - ms).toISOString();
const MIN = 60_000;
const HOUR = 60 * MIN;
const DAY = 24 * HOUR;

describe("relativeTime", () => {
  it("should say «μόλις τώρα» for less than a minute and for the future", () => {
    expect(relativeTime(ago(30_000), NOW)).toBe("μόλις τώρα");
    expect(relativeTime(ago(-5 * MIN), NOW)).toBe("μόλις τώρα");
  });

  it("should count minutes and hours with the right plural", () => {
    expect(relativeTime(ago(MIN), NOW)).toBe("πριν από 1 λεπτό");
    expect(relativeTime(ago(5 * MIN), NOW)).toBe("πριν από 5 λεπτά");
    expect(relativeTime(ago(HOUR), NOW)).toBe("πριν από 1 ώρα");
    expect(relativeTime(ago(3 * HOUR + 10 * MIN), NOW)).toBe("πριν από 3 ώρες");
  });

  it("should say «χθες» and then days up to a week", () => {
    expect(relativeTime(ago(DAY + HOUR), NOW)).toBe("χθες");
    expect(relativeTime(ago(3 * DAY), NOW)).toBe("πριν από 3 μέρες");
  });

  it("should show the Athens date after a week", () => {
    expect(relativeTime("2026-09-01T22:30:00Z", NOW)).toBe("02/09/2026");
  });

  it("should return nothing for an invalid instant", () => {
    expect(relativeTime("όχι ημερομηνία", NOW)).toBe("");
  });
});

describe("parseFilter and parseBefore", () => {
  it("should default to unread and accept only «all» otherwise", () => {
    expect(parseFilter(undefined)).toBe("unread");
    expect(parseFilter("bogus")).toBe("unread");
    expect(parseFilter("all")).toBe("all");
  });

  it("should keep only valid ISO instants", () => {
    expect(parseBefore("2026-10-12T09:00:00.123+00:00")).toBe(
      "2026-10-12T09:00:00.123+00:00",
    );
    expect(parseBefore("2026-13-45T99:00")).toBeNull();
    expect(parseBefore("yesterday")).toBeNull();
    expect(parseBefore(undefined)).toBeNull();
  });
});

describe("notificationsHref", () => {
  it("should keep the filter and the cursor in the address", () => {
    expect(notificationsHref("unread")).toBe("/app/notifications");
    expect(notificationsHref("all")).toBe("/app/notifications?show=all");
    expect(notificationsHref("all", "2026-10-12T09:00:00+00:00")).toBe(
      "/app/notifications?show=all&before=2026-10-12T09%3A00%3A00%2B00%3A00",
    );
  });
});

describe("safeLink", () => {
  it("should allow only internal /app paths", () => {
    expect(safeLink("/app/messages/abc")).toBe("/app/messages/abc");
    expect(safeLink("/app/messages?tab=requests")).toBe(
      "/app/messages?tab=requests",
    );
    expect(safeLink("https://evil.example.com")).toBe("/app/notifications");
    expect(safeLink("//evil.example.com/app")).toBe("/app/notifications");
    expect(safeLink("/application")).toBe("/app/notifications");
    expect(safeLink(null)).toBe("/app/notifications");
  });
});

describe("bellLabel and badgeText", () => {
  it("should say the unread count for screen readers", () => {
    expect(bellLabel(0)).toBe("Ειδοποιήσεις: καμία αδιάβαστη");
    expect(bellLabel(1)).toBe("Ειδοποιήσεις: 1 αδιάβαστη");
    expect(bellLabel(4)).toBe("Ειδοποιήσεις: 4 αδιάβαστες");
  });

  it("should cap the visible badge at 99+", () => {
    expect(badgeText(7)).toBe("7");
    expect(badgeText(120)).toBe("99+");
  });
});
