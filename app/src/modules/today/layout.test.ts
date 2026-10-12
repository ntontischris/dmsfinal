import { describe, expect, it } from "vitest";

import { arrangeToday } from "./layout";
import type { TodayCard } from "./view-schema";

const card = (overrides: Partial<TodayCard> & { code: string }): TodayCard => ({
  grp: "work",
  kind: "action",
  label: overrides.code,
  link: "/app",
  count: 0,
  failed: false,
  hidden: false,
  ...overrides,
});

const codes = (cards: readonly TodayCard[]) => cards.map((item) => item.code);

describe("arrangeToday", () => {
  it("should put health first and keep it even when it counts zero", () => {
    const layout = arrangeToday([
      card({ code: "deliverables", count: 2 }),
      card({ code: "health", kind: "health", grp: "health" }),
    ]);
    expect(codes(layout.visible)).toEqual(["health", "deliverables"]);
  });

  it("should collect empty action cards into the quiet line", () => {
    const layout = arrangeToday([
      card({ code: "readiness", count: 0 }),
      card({ code: "invoices", count: 3 }),
    ]);
    expect(codes(layout.visible)).toEqual(["invoices"]);
    expect(codes(layout.quiet)).toEqual(["readiness"]);
    expect(layout.isAllClear).toBe(false);
  });

  it("should always show the week card, even empty, without blocking all clear", () => {
    const layout = arrangeToday([
      card({ code: "week_filmings", kind: "week", grp: "week" }),
      card({ code: "readiness" }),
    ]);
    expect(codes(layout.visible)).toEqual(["week_filmings"]);
    expect(layout.isAllClear).toBe(true);
  });

  it("should show a card that failed to count so it can retry", () => {
    const layout = arrangeToday([card({ code: "broken", count: null, failed: true })]);
    expect(codes(layout.visible)).toEqual(["broken"]);
    expect(layout.isAllClear).toBe(false);
  });

  it("should not be all clear when health has problems", () => {
    const layout = arrangeToday([card({ code: "health", kind: "health", count: 1 })]);
    expect(layout.isAllClear).toBe(false);
  });

  it("should leave hidden cards out of both the grid and the quiet line", () => {
    const layout = arrangeToday([
      card({ code: "a", count: 1, hidden: true }),
      card({ code: "b", hidden: true }),
      card({ code: "c", count: 1 }),
    ]);
    expect(codes(layout.visible)).toEqual(["c"]);
    expect(layout.quiet).toEqual([]);
  });

  it("should report when every card is hidden", () => {
    const layout = arrangeToday([card({ code: "a", count: 4, hidden: true })]);
    expect(layout.isAllHidden).toBe(true);
    expect(layout.isAllClear).toBe(false);
  });

  it("should be all clear for a user with no cards at all", () => {
    const layout = arrangeToday([]);
    expect(layout.isAllClear).toBe(true);
    expect(layout.isAllHidden).toBe(false);
  });
});
