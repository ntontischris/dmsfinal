import { describe, expect, it } from "vitest";

import {
  activeKeys,
  auditHref,
  historyHref,
  readAuditCursor,
  readAuditFilters,
  readAuditQuery,
  rpcFilters,
  withoutFilter,
} from "./url";

const USER = "00000000-0000-0000-0000-0000000000a1";
const CLIENT = "00000000-0000-0000-0000-0000000000c1";

describe("readAuditFilters", () => {
  it("should read every filter from the address", () => {
    expect(
      readAuditFilters({
        who: USER,
        area: "finance",
        entity: "invoices",
        id: CLIENT,
        action: "update",
        period: "7d",
      }),
    ).toEqual({
      who: USER,
      area: "finance",
      entity: "invoices",
      id: CLIENT,
      action: "update",
      period: "7d",
    });
  });

  it("should default to the whole trail when nothing is set", () => {
    expect(readAuditFilters({})).toEqual({ period: "all" });
  });

  it("should drop values the database would refuse", () => {
    expect(
      readAuditFilters({
        who: "Γιώργος",
        area: "Οικονομικά",
        entity: "drop table",
        action: "truncate",
        period: "90d",
      }),
    ).toEqual({ period: "all" });
  });

  it("should accept the system actor in any case and the first of repeated values", () => {
    expect(
      readAuditFilters({ who: "SYSTEM", period: ["30d", "7d"] }),
    ).toMatchObject({ who: "system", period: "30d" });
  });

  it("should ignore an id without the element it belongs to", () => {
    expect(readAuditFilters({ id: CLIENT })).toEqual({ period: "all" });
  });
});

describe("readAuditCursor", () => {
  it("should keep a valid moment with its id", () => {
    expect(readAuditCursor("2030-01-10T11:10:00.123456+00:00", "42")).toEqual({
      at: "2030-01-10T11:10:00.123456+00:00",
      id: "42",
    });
  });

  it("should fall back to the first page for anything else", () => {
    expect(readAuditCursor("χθες", "42")).toBeNull();
    expect(readAuditCursor("2030-01-10T11:10:00Z", "abc")).toBeNull();
    expect(readAuditCursor(undefined, "42")).toBeNull();
  });
});

describe("auditHref", () => {
  it("should write the filters back so a bookmark reopens the same view", () => {
    const query = readAuditQuery({
      who: "system",
      entity: "clients",
      id: CLIENT,
      period: "30d",
    });
    const href = auditHref(query.filters);
    expect(href).toBe(
      `/app/audit?who=system&entity=clients&id=${CLIENT}&period=30d`,
    );
    const again = readAuditQuery(
      Object.fromEntries(new URL(href, "https://dms.example").searchParams),
    );
    expect(again).toEqual(query);
  });

  it("should leave the whole-trail period out of the address", () => {
    expect(auditHref({ period: "all" })).toBe("/app/audit");
  });

  it("should carry the cursor of the next page", () => {
    const href = auditHref(
      { period: "7d" },
      { at: "2030-01-10T11:10:00+00:00", id: "7" },
    );
    expect(href).toBe(
      "/app/audit?period=7d&before=2030-01-10T11%3A10%3A00%2B00%3A00&beforeId=7",
    );
    const again = readAuditQuery(
      Object.fromEntries(new URL(href, "https://dms.example").searchParams),
    );
    expect(again.cursor).toEqual({ at: "2030-01-10T11:10:00+00:00", id: "7" });
  });
});

describe("chips", () => {
  const filters = readAuditFilters({
    who: USER,
    entity: "clients",
    id: CLIENT,
    action: "delete",
    period: "7d",
  });

  it("should list the active filters in a fixed order", () => {
    expect(activeKeys(filters)).toEqual(["who", "entity", "action", "period"]);
    expect(activeKeys({ period: "all" })).toEqual([]);
  });

  it("should remove the element together with its id, and reset the period to all", () => {
    expect(rpcFilters(withoutFilter(filters, "entity"))).toEqual({
      who: USER,
      action: "delete",
      period: "7d",
    });
    expect(withoutFilter(filters, "period").period).toBe("all");
  });

  it("should send only the filters that have a value to the database", () => {
    expect(rpcFilters(withoutFilter(filters, "who"))).toEqual({
      entity: "clients",
      id: CLIENT,
      action: "delete",
      period: "7d",
    });
  });
});

describe("historyHref", () => {
  it("should open the trail filtered on one element", () => {
    expect(historyHref("agreements", CLIENT)).toBe(
      `/app/audit?entity=agreements&id=${CLIENT}`,
    );
  });
});
