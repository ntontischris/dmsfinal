import { describe, expect, it } from "vitest";

import { blockedFormValues, blockedSpan } from "./blocked-form";
import type { BlockedTime } from "./types";

const base = { untilDay: null, from: "09:00", to: "12:00" };

describe("blockedSpan", () => {
  it("should turn an all-day block into Athens midnights of its first and last day", () => {
    expect(blockedSpan({ ...base, day: "2026-10-12", untilDay: "2026-10-13", allDay: true })).toEqual({
      startsAt: "2026-10-11T21:00:00.000Z",
      endsAt: "2026-10-12T21:00:00.000Z",
    });
  });

  it("should use the first day alone when an all-day block has no end day", () => {
    expect(blockedSpan({ ...base, day: "2026-10-12", allDay: true })).toEqual({
      startsAt: "2026-10-11T21:00:00.000Z",
      endsAt: "2026-10-11T21:00:00.000Z",
    });
  });

  it("should use the given hours of the day in Athens time", () => {
    expect(blockedSpan({ ...base, day: "2026-10-12", allDay: false })).toEqual({
      startsAt: "2026-10-12T06:00:00.000Z",
      endsAt: "2026-10-12T09:00:00.000Z",
    });
  });

  it("should keep the Athens clock across the winter offset", () => {
    expect(blockedSpan({ ...base, day: "2026-11-02", allDay: false }).startsAt).toBe("2026-11-02T07:00:00.000Z");
  });
});

describe("blockedFormValues", () => {
  const time = (overrides: Partial<BlockedTime>): BlockedTime => ({
    id: "b1",
    userId: "u1",
    userName: "Νίκος",
    startsAt: "2026-10-12T06:00:00.000Z",
    endsAt: "2026-10-12T09:00:00.000Z",
    allDay: false,
    title: null,
    canEdit: true,
    canConvert: false,
    ...overrides,
  });

  it("should read the day and the Athens hours of a timed block", () => {
    expect(blockedFormValues(time({}))).toEqual({ day: "2026-10-12", untilDay: null, allDay: false, from: "09:00", to: "12:00" });
  });

  it("should read the last day of an all-day block, not the midnight after it", () => {
    const values = blockedFormValues(
      time({ startsAt: "2026-10-11T21:00:00.000Z", endsAt: "2026-10-13T21:00:00.000Z", allDay: true }),
    );
    expect(values).toMatchObject({ day: "2026-10-12", untilDay: "2026-10-13", allDay: true });
  });
});
