import { describe, expect, it } from "vitest";

import { toGoogleEventBody } from "./event-body";
import type { QueuedEvent } from "./schemas";

const ORIGIN = "https://dmsfinal-app.vercel.app";

const timedEvent = (overrides: Partial<QueuedEvent> = {}): QueuedEvent => ({
  summary: "(αναμένει) Ακρόπολη",
  description: "/app/filming/f-1",
  location: "Πλάκα",
  start: "2027-01-05T10:00:00+02:00",
  end: "2027-01-05T13:00:00+02:00",
  allDay: false,
  ...overrides,
});

describe("toGoogleEventBody", () => {
  it("writes a timed event in Europe/Athens with the app link in the description", () => {
    expect(toGoogleEventBody(timedEvent(), ORIGIN)).toEqual({
      status: "confirmed",
      summary: "(αναμένει) Ακρόπολη",
      description: "https://dmsfinal-app.vercel.app/app/filming/f-1",
      location: "Πλάκα",
      transparency: "opaque",
      start: { dateTime: "2027-01-05T10:00:00+02:00", timeZone: "Europe/Athens" },
      end: { dateTime: "2027-01-05T13:00:00+02:00", timeZone: "Europe/Athens" },
    });
  });

  it("writes an all-day event with plain dates", () => {
    const body = toGoogleEventBody(timedEvent({ allDay: true, start: "2027-01-05", end: "2027-01-06" }), ORIGIN);
    expect(body.start).toEqual({ date: "2027-01-05" });
    expect(body.end).toEqual({ date: "2027-01-06" });
  });

  it("leaves the description empty when the queue sends none", () => {
    expect(toGoogleEventBody(timedEvent({ description: "" }), ORIGIN).description).toBe("");
  });
});
