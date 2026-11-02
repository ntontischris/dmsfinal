import { describe, expect, it } from "vitest";

import type { BookingAgreement, BookingKind } from "../types";
import {
  FREE,
  dayWithWeekday,
  durationChoiceOf,
  hoursOf,
  isPastDay,
  kindBalanceLine,
  periodLine,
  uniqueClients,
} from "./e4-model";

const kind = (overrides: Partial<BookingKind> = {}): BookingKind => ({
  id: "k1",
  label: "Γύρισμα",
  measure: "per_filming",
  defaultHours: 3,
  balance: 2,
  ...overrides,
});

const agreement = (id: string, clientId: string, overrides: Partial<BookingAgreement> = {}): BookingAgreement => ({
  id,
  title: `Συμφωνία ${id}`,
  kind: "monthly",
  client: { id: clientId, name: `Πελάτης ${clientId}` },
  noticeHours: 48,
  cancelHours: 24,
  horizonDays: 60,
  bookingNeedsApproval: true,
  period: { id: "p1", n: 2, starts: "2026-10-01", ends: "2026-10-31" },
  kinds: [kind()],
  ...overrides,
});

describe("E4 model", () => {
  it("should list each client once in the order they came", () => {
    const clients = uniqueClients([agreement("a1", "c1"), agreement("a2", "c2"), agreement("a3", "c1")]);
    expect(clients.map((c) => c.id)).toEqual(["c1", "c2"]);
  });

  it("should write the day with its weekday", () => {
    expect(dayWithWeekday("2026-09-30")).toBe("Τετάρτη 30/09");
  });

  it("should treat only earlier days as past", () => {
    expect(isPastDay("2026-10-01", "2026-10-02")).toBe(true);
    expect(isPastDay("2026-10-02", "2026-10-02")).toBe(false);
    expect(isPastDay("", "2026-10-02")).toBe(false);
  });

  it("should read preset and free durations, with a Greek comma", () => {
    expect(hoursOf("3", "9")).toBe(3);
    expect(hoursOf(FREE, "2,5")).toBe(2.5);
  });

  it("should light the preset button or the free one", () => {
    expect(durationChoiceOf(3, [2, 3, 4])).toBe("3");
    expect(durationChoiceOf(5, [2, 3, 4])).toBe(FREE);
  });

  it("should describe the kind balance and the current period", () => {
    expect(kindBalanceLine(kind())).toBe("ανά Γύρισμα · υπόλοιπο 2");
    expect(kindBalanceLine(kind({ balance: null }))).toContain("χωρίς μέτρηση");
    expect(periodLine(agreement("a1", "c1"))).toMatch(/^Περίοδος 2 · /);
    expect(periodLine(agreement("a1", "c1", { period: null }))).toBeNull();
  });
});
