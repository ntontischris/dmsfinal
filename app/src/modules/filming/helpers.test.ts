import { describe, expect, it } from "vitest";

import {
  activeSignals,
  balanceText,
  defaultHours,
  defaultKindId,
  historyLines,
  isExtraBalance,
  openFilmingChoices,
  stateTone,
  waitingText,
} from "./helpers";
import type { BookingKind, FilmingHistoryEntry, FilmingRow } from "./types";

const kind = (overrides: Partial<BookingKind> = {}): BookingKind => ({
  id: "44444444-4444-4444-8444-444444444444",
  label: "Reel",
  measure: "per_filming",
  defaultHours: 3,
  balance: 2,
  ...overrides,
});

const event = (name: string, after: Record<string, unknown> | null = null): FilmingHistoryEntry => ({
  at: "2026-10-09T07:00:00.000Z",
  action: "event",
  event: name,
  actorName: "Νίκος",
  before: null,
  after,
});

describe("activeSignals", () => {
  it("should list only the signals that are on, in the screen order", () => {
    const labels = activeSignals({
      equipmentConflict: false,
      isExtra: true,
      cancelRequest: false,
      crewDeclined: true,
    }).map((signal) => signal.label);
    expect(labels).toEqual(["Έξτρα", "«Δεν μπορώ»"]);
  });

  it("should return nothing when no signal is on", () => {
    expect(
      activeSignals({ equipmentConflict: false, isExtra: false, cancelRequest: false, crewDeclined: false }),
    ).toEqual([]);
  });
});

describe("balance helpers", () => {
  it("should show the remaining count without amounts", () => {
    expect(balanceText(2.5)).toBe("υπόλοιπο 2,5");
  });

  it("should say the balance is gone at zero", () => {
    expect(balanceText(0)).toBe("χωρίς υπόλοιπο");
  });

  it("should flag an extra filming only when a counted balance is exhausted", () => {
    expect(isExtraBalance(0)).toBe(true);
    expect(isExtraBalance(1)).toBe(false);
    expect(isExtraBalance(null)).toBe(false);
  });
});

describe("booking form defaults", () => {
  it("should pre-select the first kind and its default duration", () => {
    const kinds = [kind({ id: "a", defaultHours: 4 }), kind({ id: "b" })];
    expect(defaultKindId(kinds)).toBe("a");
    expect(defaultHours(kinds[0])).toBe(4);
  });

  it("should fall back to three hours and no kind when there is nothing to choose", () => {
    expect(defaultKindId([])).toBe("");
    expect(defaultHours(undefined)).toBe(3);
  });
});

describe("stateTone and waitingText", () => {
  it("should mark done filmings as ok and pending ones as attention", () => {
    expect(stateTone("done")).toBe("ok");
    expect(stateTone("pending")).toBe("attention");
    expect(stateTone("scheduled")).toBeUndefined();
  });

  it("should round the waiting time to whole hours in Greek", () => {
    expect(waitingText(36.4)).toBe("περιμένει 36 ώρες");
  });
});

describe("historyLines", () => {
  it("should write the event label with the reason of the change", () => {
    const lines = historyLines([event("cancelled", { reason: "Δεν θα γυριστεί" })]);
    expect(lines).toEqual([
      { at: "2026-10-09T07:00:00.000Z", actor: "Νίκος", text: "Ακυρώθηκε. Λόγος: Δεν θα γυριστεί" },
    ]);
  });

  it("should skip the row-level inserts and updates that the events already describe", () => {
    const row: FilmingHistoryEntry = { ...event("x"), action: "update", event: null };
    expect(historyLines([row])).toEqual([]);
  });
});

describe("openFilmingChoices", () => {
  it("should keep only what the reservation form needs", () => {
    const row: FilmingRow = {
      id: "55555555-5555-4555-8555-555555555555",
      startsAt: "2026-10-10T07:00:00.000Z",
      hours: 3,
      state: "scheduled",
      client: null,
      production: { id: "66666666-6666-4666-8666-666666666666", title: "Showreel" },
      crew: null,
      signals: { equipmentConflict: false, isExtra: false, cancelRequest: false, crewDeclined: false },
    };
    expect(openFilmingChoices([row])).toEqual([
      { id: row.id, startsAt: row.startsAt, hours: 3, production: row.production },
    ]);
  });
});
