import { describe, expect, it } from "vitest";

import { planBooking } from "./booking-plan";
import type { BookingOptions } from "./booking-types";
import type { BookingAgreement, BookingKind } from "./types";

const kind = (id: string, balance: number | null, defaultHours: number | null = 3): BookingKind => ({
  id,
  label: `Είδος ${id}`,
  measure: "per_filming",
  defaultHours,
  balance,
});

const agreement = (id: string, kinds: BookingKind[]): BookingAgreement => ({
  id,
  title: `Συμφωνία ${id}`,
  kind: "monthly",
  client: { id: "c1", name: "Πελάτης" },
  noticeHours: 24,
  cancelHours: 48,
  horizonDays: 60,
  bookingNeedsApproval: false,
  period: null,
  kinds,
});

const options = (agreements: BookingAgreement[]): BookingOptions => ({
  isSet: true,
  durations: [2, 3, 4],
  stepMinutes: 60,
  horizonDays: 60,
  agreements,
});

describe("planBooking", () => {
  it("should pick the first agreement and its first kind with balance when nothing is chosen", () => {
    const plan = planBooking(
      options([agreement("a1", [kind("k0", 0), kind("k1", 2)])]),
      {},
    );
    expect(plan?.kind.id).toBe("k1");
  });

  it("should use the kind default hours when the chosen hours are not offered", () => {
    const plan = planBooking(options([agreement("a1", [kind("k1", 2, 3)])]), { hours: "7" });
    expect(plan?.hours).toBe(3);
  });

  it("should keep the chosen hours when the client may book them", () => {
    const plan = planBooking(options([agreement("a1", [kind("k1", 2)])]), { hours: "4" });
    expect(plan?.hours).toBe(4);
  });

  it("should return no plan when every kind has no balance", () => {
    expect(planBooking(options([agreement("a1", [kind("k1", 0)])]), {})).toBeNull();
  });

  it("should allow a reschedule on a kind with no balance, since the filming already holds it", () => {
    const plan = planBooking(
      options([agreement("a1", [kind("k1", 0)])]),
      { reschedule: "f1", agreement: "a1", kind: "k1" },
    );
    expect(plan?.kind.id).toBe("k1");
  });
});
