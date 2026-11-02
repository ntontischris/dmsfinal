import { describe, expect, it } from "vitest";

import type { BookingException, BookingHoliday } from "../booking-types";
import type { FilmingSettings } from "../types";
import { exceptionState, holidayLook, o4RulesOf, parsePart, partHref } from "./o4-model";

const settings: FilmingSettings = {
  bookingNeedsApproval: true,
  noAnswerAction: "none",
  noAnswerHours: 24,
  horizonDays: 60,
  allowOutsidePeriod: false,
  rescheduleNeedsApproval: false,
  equipmentConflict: "warn",
  clientSeesEquipment: false,
  sheetSending: "manual",
  changeResetsConfirmations: true,
  doneMarking: "manual",
};

const labels = { noAnswer: {}, conflict: {}, sheet: {}, done: {} };

const exception = (overrides: Partial<BookingException> = {}): BookingException => ({
  day: "2026-12-24",
  isClosed: false,
  opens: null,
  closes: null,
  capacity: null,
  note: null,
  ...overrides,
});

const holiday = (overrides: Partial<BookingHoliday> = {}): BookingHoliday => ({
  day: "2026-12-25",
  name: "Χριστούγεννα",
  movable: false,
  isOpen: false,
  isOpened: false,
  isPast: false,
  ...overrides,
});

describe("O4 model", () => {
  it("should fall back to the rules part and link it without a query", () => {
    expect(parsePart("hours")).toBe("hours");
    expect(parsePart("x")).toBe("rules");
    expect(partHref("rules")).toBe("/app/settings/filming");
    expect(partHref("google")).toBe("/app/settings/filming?part=google");
  });

  it("should send yes/no rules as the old checkbox value", () => {
    const rules = o4RulesOf(settings, labels);
    expect(rules).toHaveLength(11);
    expect(rules.find((r) => r.name === "bookingNeedsApproval")?.value).toBe("on");
    expect(rules.find((r) => r.name === "allowOutsidePeriod")?.value).toBe("");
    expect(rules.find((r) => r.name === "horizonDays")?.value).toBe(60);
  });

  it("should describe an exception day", () => {
    expect(exceptionState(exception({ isClosed: true }))).toBe("κλειστά");
    expect(exceptionState(exception({ opens: "10:00", closes: "14:00", capacity: 1 }))).toBe("10:00–14:00 · χωρητικότητα 1");
    expect(exceptionState(exception())).toBe("ωράριο της εβδομάδας");
  });

  it("should tell an opened holiday on a closed weekday apart", () => {
    expect(holidayLook(holiday())).toBe("closed");
    expect(holidayLook(holiday({ isOpen: true, isOpened: true }))).toBe("open");
    expect(holidayLook(holiday({ isOpened: true }))).toBe("opened-closed-day");
  });
});
