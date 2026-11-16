import { describe, expect, it } from "vitest";

import type { E1Filming } from "./e1-groups";
import { filmingStripOf } from "./e1-strip-model";

const NOW = Date.parse("2026-11-16T10:00:00Z");
const TODAY = "2026-11-16";

const filmingOf = (over: Partial<E1Filming> = {}): E1Filming => ({
  id: "f",
  date: "2026-11-18",
  start: "10:00",
  end: "12:00",
  startsAtMs: Date.parse("2026-11-18T08:00:00Z"),
  endsAtMs: Date.parse("2026-11-18T10:00:00Z"),
  state: "scheduled",
  clientId: "c",
  clientName: "Ταβέρνα",
  productionTitle: "Νοέμβριος",
  location: null,
  crew: { confirmed: 2, total: 2 },
  crewUserIds: ["u1", "u2"],
  signals: {
    equipmentConflict: false,
    isExtra: false,
    crewDeclined: false,
    cancelRequest: false,
    slotProblem: null,
    pendingReschedule: null,
  },
  ...over,
});

const stripOf = (
  filmings: readonly E1Filming[],
  requestCount: number | null = 0,
) => filmingStripOf({ filmings, requestCount, nowMs: NOW, today: TODAY });

describe("τα τρία χοντρά της καρτέλας Γυρίσματα", () => {
  it("δείχνει πάντα τις τρεις κάρτες με τη σειρά τους, ήσυχες όταν είναι 0", () => {
    const strip = stripOf([]);
    expect(strip.map((stat) => stat.label)).toEqual([
      "Αναμένουν απάντηση",
      "Θέλουν «έγινε»",
      "Ομάδα που λείπει",
    ]);
    expect(strip.map((stat) => stat.value)).toEqual(["0", "0", "0"]);
    expect(strip.every((stat) => stat.tone === undefined)).toBe(true);
  });

  it("χωρίς δικαίωμα έγκρισης η κάρτα των αιτημάτων δεν εμφανίζεται", () => {
    expect(stripOf([], null).map((stat) => stat.label)).toEqual([
      "Θέλουν «έγινε»",
      "Ομάδα που λείπει",
    ]);
  });

  it("τα αιτήματα ανοίγουν τον οδηγό «Εγκρίνω» και ζητούν προσοχή", () => {
    const [requests] = stripOf([], 3);
    expect(requests).toMatchObject({
      value: "3",
      tone: "attention",
      href: "/app/filming/queue?job=egkrino-gyrismata&step=1",
    });
  });

  it("μετρά όσα τελείωσαν χωρίς σήμανση και πηγαίνει στη Λίστα", () => {
    const ended = filmingOf({
      endsAtMs: NOW - 3_600_000,
      startsAtMs: NOW - 7_200_000,
    });
    const [, outcome] = stripOf([ended, ended, filmingOf()]);
    expect(outcome).toMatchObject({
      value: "2",
      tone: "attention",
      href: "/app/filming?view=list",
    });
  });

  it("η ομάδα που λείπει: τις επόμενες 7 ημέρες, χωρίς άτομα ή με άρνηση", () => {
    const noCrew = filmingOf({ crew: { confirmed: 0, total: 0 } });
    const declined = filmingOf({
      signals: { ...filmingOf().signals, crewDeclined: true },
    });
    const later = filmingOf({
      date: "2026-11-30",
      crew: { confirmed: 0, total: 0 },
    });
    const hidden = filmingOf({ crew: null });
    const [, , crew] = stripOf([noCrew, declined, later, hidden, filmingOf()]);
    expect(crew).toMatchObject({
      value: "2",
      tone: "attention",
      href: "/app/filming?period=week",
    });
  });

  it("τα κλειστά και όσα πέρασαν δεν μετρούν στην ομάδα", () => {
    const cancelled = filmingOf({
      state: "cancelled",
      crew: { confirmed: 0, total: 0 },
    });
    const ended = filmingOf({
      endsAtMs: NOW - 1,
      crew: { confirmed: 0, total: 0 },
    });
    const [, , crew] = stripOf([cancelled, ended]);
    expect(crew.value).toBe("0");
  });
});
