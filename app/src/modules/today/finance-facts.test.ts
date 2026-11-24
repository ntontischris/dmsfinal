import { describe, expect, it } from "vitest";

import {
  parseBillablesTotal,
  parseMonthReceived,
  receivedFor,
} from "./finance-facts";

describe("receivedFor", () => {
  it("should show the sum of the same month as the KPIs", () => {
    expect(receivedFor("2026-11", { month: "2026-11", received: 300.3 })).toBe(300.3);
  });

  it("should hide it for another month, a viewer without amounts or a failed read", () => {
    expect(receivedFor("2026-11", { month: "2026-12", received: 10 })).toBeNull();
    expect(receivedFor("2026-11", { month: "2026-11", received: null })).toBeNull();
    expect(receivedFor("2026-11", null)).toBeNull();
  });
});

describe("parsers", () => {
  it("should read only the total of billables_view", () => {
    expect(parseBillablesTotal({ total: 7400, count: 8, clients: [] })).toBe(
      7400,
    );
  });

  it("should read today_received with or without an amount", () => {
    expect(parseMonthReceived({ month: "2026-11", received: 12.5 })).toEqual({
      month: "2026-11",
      received: 12.5,
    });
    expect(parseMonthReceived({ month: "2026-11", received: null }).received).toBeNull();
  });
});
