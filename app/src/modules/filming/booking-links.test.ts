import { describe, expect, it } from "vitest";

import {
  bookingHref,
  bookingSelectionSchema,
  withAgreement,
  withDay,
  withKind,
  withTime,
} from "./booking-links";

describe("bookingHref", () => {
  it("should build the booking page path with only the chosen steps", () => {
    expect(bookingHref({ agreement: "a1", kind: "k1" })).toBe("/app/book?agreement=a1&kind=k1");
  });

  it("should return the bare page when nothing is chosen", () => {
    expect(bookingHref({})).toBe("/app/book");
  });
});

describe("step helpers", () => {
  const chosen = { agreement: "a1", kind: "k1", day: "2026-10-12", hours: "2", time: "10:00" };

  it("should clear the day, hours and time when the agreement changes", () => {
    expect(withAgreement(chosen, "a2")).toEqual({ agreement: "a2" });
  });

  it("should clear the day, hours and time when the kind changes", () => {
    expect(withKind(chosen, "k2")).toEqual({ agreement: "a1", kind: "k2" });
  });

  it("should clear the hours and time when the day changes", () => {
    expect(withDay(chosen, "2026-10-13")).toEqual({
      agreement: "a1",
      kind: "k1",
      day: "2026-10-13",
    });
  });

  it("should keep the day and hours when a time is chosen", () => {
    expect(withTime(chosen, "11:00")).toEqual({ ...chosen, time: "11:00" });
  });

  it("should keep the reschedule marker through every step", () => {
    expect(withDay({ reschedule: "f1", agreement: "a1", kind: "k1" }, "2026-10-13")).toEqual({
      reschedule: "f1",
      agreement: "a1",
      kind: "k1",
      day: "2026-10-13",
    });
  });
});

const AGREEMENT_ID = "123e4567-e89b-42d3-a456-426614174000";

describe("bookingSelectionSchema", () => {
  it("should ignore repeated query values instead of failing the page", () => {
    expect(bookingSelectionSchema.parse({ day: ["a", "b"], agreement: AGREEMENT_ID })).toEqual({
      agreement: AGREEMENT_ID,
      day: undefined,
      kind: undefined,
      hours: undefined,
      time: undefined,
      reschedule: undefined,
    });
  });
});

describe("bookingSelectionSchema validation", () => {
  it("should ignore malformed values instead of failing the page", () => {
    expect(
      bookingSelectionSchema.parse({
        agreement: "not-a-uuid",
        kind: "also-not",
        day: "2026-13-45",
        hours: "abc",
        time: "25:99",
        reschedule: "nope",
      }),
    ).toEqual({
      agreement: undefined,
      kind: undefined,
      day: undefined,
      hours: undefined,
      time: undefined,
      reschedule: undefined,
    });
  });

  it("should keep well-formed values", () => {
    expect(
      bookingSelectionSchema.parse({ agreement: AGREEMENT_ID, day: "2026-10-12", hours: "1.5", time: "09:30" }),
    ).toEqual({ agreement: AGREEMENT_ID, day: "2026-10-12", hours: "1.5", time: "09:30" });
  });
});
