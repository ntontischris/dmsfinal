import { describe, expect, it } from "vitest";

import {
  bookSchema,
  crewRespondSchema,
  dateSchema,
  decideCancelSchema,
  hoursSchema,
  rescheduleSchema,
  settingsSchema,
  timeSchema,
} from "./schemas";

const FILMING_ID = "11111111-1111-4111-8111-111111111111";
const AGREEMENT_ID = "22222222-2222-4222-8222-222222222222";

type Outcome = { success: boolean; error?: { issues: { message: string }[] } };

const firstMessage = (result: Outcome): string | null =>
  result.success ? null : (result.error?.issues[0]?.message ?? null);

describe("dateSchema and timeSchema", () => {
  it("should accept a real calendar day", () => {
    expect(dateSchema.safeParse("2026-10-09").success).toBe(true);
  });

  it("should reject a date that does not exist", () => {
    expect(firstMessage(dateSchema.safeParse("2026-02-31"))).toBe("Διάλεξε ημερομηνία.");
  });

  it("should accept a 24-hour clock time and reject a 25:00", () => {
    expect(timeSchema.safeParse("23:59").success).toBe(true);
    expect(firstMessage(timeSchema.safeParse("25:00"))).toBe("Βάλε ώρα σε μορφή ΩΩ:ΛΛ.");
  });
});

describe("hoursSchema", () => {
  it("should accept half hours written with a comma or a dot", () => {
    expect(hoursSchema.parse("2,5")).toBe(2.5);
    expect(hoursSchema.parse("4")).toBe(4);
  });

  it("should reject a duration below 0,5, above 12, or off the half-hour step", () => {
    const message = "Η διάρκεια είναι από 0,5 έως 12 ώρες, ανά μισή ώρα.";
    expect(firstMessage(hoursSchema.safeParse("0"))).toBe(message);
    expect(firstMessage(hoursSchema.safeParse("12.5"))).toBe(message);
    expect(firstMessage(hoursSchema.safeParse("2.3"))).toBe(message);
  });
});

describe("bookSchema", () => {
  it("should turn the Athens date and time into a UTC start and drop empty optional fields", () => {
    const parsed = bookSchema.parse({
      agreementId: AGREEMENT_ID,
      date: "2026-01-15",
      time: "10:30",
      hours: "3",
      kindId: "",
      location: "  ",
      note: "",
    });
    expect(parsed).toEqual({
      agreementId: AGREEMENT_ID,
      startsAt: "2026-01-15T08:30:00.000Z",
      hours: 3,
      kindId: null,
      location: null,
      note: null,
    });
  });
});

describe("rescheduleSchema", () => {
  it("should build the new start from date, time and hours", () => {
    const parsed = rescheduleSchema.parse({
      filmingId: FILMING_ID,
      date: "2026-07-15",
      time: "09:00",
      hours: "2",
    });
    expect(parsed.startsAt).toBe("2026-07-15T06:00:00.000Z");
    expect(parsed.hours).toBe(2);
  });
});

describe("crewRespondSchema", () => {
  it("should require a reason when a member cannot come", () => {
    const result = crewRespondSchema.safeParse({
      filmingId: FILMING_ID,
      response: "declined",
      reason: "",
    });
    expect(firstMessage(result)).toBe("Το «δεν μπορώ» θέλει λόγο.");
  });

  it("should not require a reason when a member confirms", () => {
    expect(
      crewRespondSchema.safeParse({ filmingId: FILMING_ID, response: "confirmed", reason: "" }).success,
    ).toBe(true);
  });
});

describe("decideCancelSchema", () => {
  it("should accept only accept or refuse as the decision", () => {
    expect(
      decideCancelSchema.safeParse({ filmingId: FILMING_ID, accept: "maybe", reason: "" }).success,
    ).toBe(false);
  });
});

describe("settingsSchema", () => {
  const rules = {
    bookingNeedsApproval: true,
    noAnswerAction: "none",
    noAnswerHours: 24,
    horizonDays: 60,
    allowOutsidePeriod: false,
    rescheduleNeedsApproval: true,
    equipmentConflict: "warn",
    clientSeesEquipment: false,
    sheetSending: "manual",
    changeResetsConfirmations: true,
    doneMarking: "manual",
  };

  it("should accept the default rules", () => {
    expect(settingsSchema.safeParse(rules).success).toBe(true);
  });

  it("should reject a horizon beyond a year", () => {
    expect(settingsSchema.safeParse({ ...rules, horizonDays: 400 }).success).toBe(false);
  });
});
