import { describe, expect, it } from "vitest";

import {
  buildCalendarIcs,
  escapeText,
  foldLine,
  formatUtc,
  type IcsEvent,
} from "./ics";

const NOW = new Date("2026-10-11T10:00:00Z");

const eventOf = (overrides: Partial<IcsEvent> = {}): IcsEvent => ({
  uid: "filming-1@dmsfinal",
  startsAt: "2026-10-12T06:00:00Z",
  endsAt: "2026-10-12T09:00:00Z",
  allDay: false,
  summary: "Γύρισμα",
  location: null,
  description: null,
  ...overrides,
});

describe("escapeText", () => {
  it("should escape backslashes, semicolons, commas and line breaks in that order", () => {
    expect(escapeText("a\\b;c,d\ne")).toBe("a\\\\b\\;c\\,d\\ne");
  });
});

describe("formatUtc", () => {
  it("should write an instant as a UTC basic date-time", () => {
    expect(formatUtc("2026-10-12T06:00:00+03:00")).toBe("20261012T030000Z");
    expect(formatUtc(new Date("2026-10-12T06:00:00Z"))).toBe(
      "20261012T060000Z",
    );
  });
});

describe("foldLine", () => {
  it("should keep a short line whole", () => {
    expect(foldLine("SUMMARY:Γύρισμα")).toEqual(["SUMMARY:Γύρισμα"]);
  });

  it("should fold a long line into parts of at most 75 octets, continued with a space", () => {
    const parts = foldLine(`DESCRIPTION:${"a".repeat(200)}`);
    expect(
      parts.every((part) => new TextEncoder().encode(part).length <= 75),
    ).toBe(true);
    expect(parts.slice(1).every((part) => part.startsWith(" "))).toBe(true);
    expect(
      parts.map((part, index) => (index === 0 ? part : part.slice(1))).join(""),
    ).toBe(`DESCRIPTION:${"a".repeat(200)}`);
  });

  it("should never split a Greek character across two parts", () => {
    const line = `SUMMARY:${"Γ".repeat(60)}`;
    const parts = foldLine(line);
    expect(
      parts.map((part, index) => (index === 0 ? part : part.slice(1))).join(""),
    ).toBe(line);
    expect(
      parts.every((part) => new TextEncoder().encode(part).length <= 75),
    ).toBe(true);
  });
});

describe("buildCalendarIcs", () => {
  it("should write a calendar with the Athens timezone and the owner name", () => {
    const text = buildCalendarIcs({ name: "Ρένα", events: [] }, NOW);
    expect(text.startsWith("BEGIN:VCALENDAR\r\n")).toBe(true);
    expect(text).toContain("X-WR-CALNAME:Devre Media · Ρένα\r\n");
    expect(text).toContain("X-WR-TIMEZONE:Europe/Athens\r\n");
    expect(text.endsWith("END:VCALENDAR\r\n")).toBe(true);
  });

  it("should write each event in UTC with the stamp it was built at", () => {
    const text = buildCalendarIcs({ name: null, events: [eventOf()] }, NOW);
    expect(text).toContain("DTSTART:20261012T060000Z\r\n");
    expect(text).toContain("DTEND:20261012T090000Z\r\n");
    expect(text).toContain("DTSTAMP:20261011T100000Z\r\n");
    expect(text).toContain("X-WR-CALNAME:Devre Media\r\n");
  });

  it("should escape the summary and omit empty optional lines", () => {
    const text = buildCalendarIcs(
      {
        name: null,
        events: [
          eventOf({ summary: "Γύρισμα; Αθήνα, πλατεία", location: null }),
        ],
      },
      NOW,
    );
    expect(text).toContain("SUMMARY:Γύρισμα\\; Αθήνα\\, πλατεία\r\n");
    expect(text).not.toContain("LOCATION:");
  });

  it("should write an all-day event as Athens dates with an exclusive end", () => {
    const text = buildCalendarIcs(
      {
        name: null,
        events: [
          eventOf({
            allDay: true,
            startsAt: "2026-10-11T21:00:00Z",
            endsAt: "2026-10-13T21:00:00Z",
          }),
        ],
      },
      NOW,
    );
    expect(text).toContain("DTSTART;VALUE=DATE:20261012\r\n");
    expect(text).toContain("DTEND;VALUE=DATE:20261014\r\n");
    expect(text).not.toContain("DTSTART:");
  });

  it("should use CRLF on every line", () => {
    const text = buildCalendarIcs({ name: "x", events: [eventOf()] }, NOW);
    expect(text.split("\r\n").length).toBeGreaterThan(5);
    expect(text.replace(/\r\n/g, "")).not.toContain("\n");
  });
});
