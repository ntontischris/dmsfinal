import { describe, expect, it } from "vitest";

import { guideStartOf, spanOn, type GuideStartInput } from "./e4-guide";

// Δευτέρα 16/11/2026, Αθήνα = UTC+2 (χειμερινή ώρα).
const input = (over: Partial<GuideStartInput> = {}): GuideStartInput => ({
  hours: null,
  stepMinutes: 30,
  slot: { date: "2026-11-16", time: "09:00" },
  length: 3,
  members: ["anna"],
  busy: [],
  ...over,
});

const busy = (userId: string, from: string, to: string) => ({
  userIds: [userId],
  startsAt: `2026-11-16T${from}:00Z`,
  endsAt: `2026-11-16T${to}:00Z`,
});

describe("spanOn", () => {
  it("should convert a busy entry to Athens minutes of the day", () => {
    expect(spanOn(busy("anna", "07:00", "09:00"), "2026-11-16")).toEqual({ from: 540, to: 660 });
  });

  it("should ignore an entry on another day", () => {
    expect(spanOn(busy("anna", "07:00", "09:00"), "2026-11-17")).toBeNull();
  });
});

describe("guideStartOf", () => {
  it("should keep the first working slot when the crew is free", () => {
    expect(guideStartOf(input())).toEqual({ kind: "free", slot: { date: "2026-11-16", time: "09:00" } });
  });

  it("should move after a filming of a template member", () => {
    // Η Άννα γυρίζει 09:00–11:00 Αθήνας → πρώτο κενό 3 ωρών στις 11:00.
    const result = guideStartOf(input({ busy: [busy("anna", "07:00", "09:00")] }));
    expect(result).toEqual({ kind: "free", slot: { date: "2026-11-16", time: "11:00" } });
  });

  it("should ignore people outside the template", () => {
    const result = guideStartOf(input({ busy: [busy("nikos", "07:00", "15:00")] }));
    expect(result.slot.time).toBe("09:00");
  });

  it("should warn when the crew is busy the whole working day", () => {
    const result = guideStartOf(input({ busy: [busy("anna", "08:00", "14:00")] }));
    expect(result).toEqual({ kind: "busy", slot: { date: "2026-11-16", time: "09:00" } });
  });
});
