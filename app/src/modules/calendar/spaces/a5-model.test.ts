import { describe, expect, it } from "vitest";

import type { CalendarDay, CalendarEntry } from "../calendar-days";
import {
  a5ItemsOf,
  filmingsFirst,
  filtersSummary,
  fmtLong,
  groupByDate,
  hasEvents,
  layerOptions,
  toggledLayers,
} from "./a5-model";

const entry = (overrides: Partial<CalendarEntry> = {}): CalendarEntry => ({
  key: "filming-1",
  kind: "filming",
  startsAt: "2026-11-03T08:00:00Z",
  time: "10:00–12:30",
  title: "Κυψέλη Καφέ",
  detail: null,
  mark: null,
  isPending: false,
  href: "/app/filming/1",
  ...overrides,
});

const day = (overrides: Partial<CalendarDay> = {}): CalendarDay => ({
  date: "2026-11-03",
  status: "open",
  holidayName: null,
  entries: [],
  ...overrides,
});

describe("a5ItemsOf", () => {
  it("should split the time span into from and to", () => {
    const [item] = a5ItemsOf([day({ entries: [entry()] })], true, false);
    expect(item).toMatchObject({ kind: "filming", from: "10:00", to: "12:30", date: "2026-11-03", status: null });
  });

  it("should mark a pending filming as awaiting approval", () => {
    const [item] = a5ItemsOf([day({ entries: [entry({ isPending: true })] })], true, false);
    expect(item?.status).toBe("αναμένει έγκριση");
  });

  it("should leave all-day blocked time without hours", () => {
    const [item] = a5ItemsOf(
      [day({ entries: [entry({ key: "blocked-1", kind: "blocked", time: "όλη μέρα", href: null })] })],
      true,
      false,
    );
    expect(item).toMatchObject({ kind: "blocked", from: null, to: null, href: null });
  });

  it("should show a closed or holiday day to the team as a closed item first", () => {
    const items = a5ItemsOf(
      [day({ status: "holiday", holidayName: "Επέτειος του Όχι", entries: [entry()] })],
      true,
      false,
    );
    expect(items[0]).toMatchObject({ kind: "closed", title: "Επέτειος του Όχι" });
    expect(items).toHaveLength(2);
  });

  it("should not add a status item for an open day", () => {
    expect(a5ItemsOf([day()], true, false)).toEqual([]);
  });

  it("should let a client book a free day only with booking rights", () => {
    const [bookable] = a5ItemsOf([day({ status: "free" })], false, true);
    expect(bookable).toMatchObject({ kind: "day", status: "ελεύθερη", href: "/app/book?day=2026-11-03" });
    const [readOnly] = a5ItemsOf([day({ status: "free" })], false, false);
    expect(readOnly?.href).toBeNull();
  });

  it("should keep the same entry distinct on each day it covers", () => {
    const blocked = entry({ key: "blocked-2", kind: "blocked", time: "όλη μέρα" });
    const items = a5ItemsOf(
      [day({ entries: [blocked] }), day({ date: "2026-11-04", entries: [blocked] })],
      true,
      false,
    );
    expect(new Set(items.map((item) => item.id)).size).toBe(2);
  });
});

describe("helpers", () => {
  it("should count only real events, not day statuses, as something this period", () => {
    expect(hasEvents(a5ItemsOf([day({ status: "closed" })], true, false))).toBe(false);
    expect(hasEvents(a5ItemsOf([day({ entries: [entry()] })], true, false))).toBe(true);
  });

  it("should put filmings first in a day", () => {
    const items = a5ItemsOf(
      [day({ entries: [entry({ key: "busy-1", kind: "busy" }), entry()] })],
      true,
      false,
    );
    expect(filmingsFirst(items).map((item) => item.kind)).toEqual(["filming", "busy"]);
  });

  it("should group items by date in order", () => {
    const items = a5ItemsOf(
      [day({ entries: [entry()] }), day({ date: "2026-11-05", entries: [entry()] })],
      true,
      false,
    );
    expect(groupByDate(items).map(([date]) => date)).toEqual(["2026-11-03", "2026-11-05"]);
  });

  it("should write a long Greek day label", () => {
    expect(fmtLong("2026-11-03")).toBe("Τρίτη 03/11");
  });

  const NONE = { seesNextSteps: false, seesDeadlines: false, hasBusy: false };

  it("should offer the team layer only when there is busy time", () => {
    expect(layerOptions(NONE).map((option) => option.key)).toEqual(["filmings", "blocked"]);
    expect(layerOptions({ ...NONE, hasBusy: true }).map((option) => option.key)).toEqual(["filmings", "blocked", "busy"]);
  });

  it("should offer next steps and deadlines only to those who may see them", () => {
    const all = layerOptions({ seesNextSteps: true, seesDeadlines: true, hasBusy: true });
    expect(all.map((option) => option.label)).toEqual([
      "Γυρίσματα",
      "Ρεπό, άδειες",
      "Επόμενα βήματα",
      "Προθεσμίες",
      "Ομάδα",
    ]);
    expect(layerOptions({ ...NONE, seesDeadlines: true }).map((option) => option.key)).toEqual([
      "filmings",
      "blocked",
      "deadlines",
    ]);
  });

  it("should carry the kind of a blocked time as its mark", () => {
    const [item] = a5ItemsOf(
      [day({ entries: [entry({ key: "blocked-3", kind: "blocked", mark: "Ραντεβού" })] })],
      true,
      false,
    );
    expect(item?.mark).toBe("Ραντεβού");
  });

  it("should toggle a layer and summarise what is hidden", () => {
    expect(toggledLayers(["filmings", "blocked"], "blocked")).toEqual(["filmings"]);
    expect(toggledLayers(["filmings"], "blocked")).toEqual(["filmings", "blocked"]);
    expect(filtersSummary(layerOptions(NONE), ["filmings", "blocked"])).toBe("όλα");
    expect(filtersSummary(layerOptions({ ...NONE, hasBusy: true }), ["filmings"])).toBe("2 κρυμμένα");
    expect(filtersSummary(layerOptions(NONE), ["filmings", "blocked"], "Εγώ")).toBe("Εγώ · όλα");
  });
});
