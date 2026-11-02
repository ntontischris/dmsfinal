import { describe, expect, it } from "vitest";

import type { AuditItem, AuditOptions } from "../schema";
import { p1ChipsOf, p1RowOf, p1When } from "./p1-adapter";

const CLIENT = "11111111-1111-4111-8111-111111111111";

const item = (overrides: Partial<AuditItem> = {}): AuditItem => ({
  id: 7,
  at: "2026-03-01T10:00:00Z",
  actorId: null,
  actorName: "Άννα Δημητρίου",
  action: "update",
  entity: "clients",
  entityLabel: "Πελάτης",
  area: "sales",
  areaLabel: "Πωλήσεις",
  parent: null,
  entityId: CLIENT,
  parentId: null,
  subject: "Κυψέλη Καφέ",
  before: { name: "Κυψέλη", fee: { $hidden: "amount" } },
  after: { name: "Κυψέλη Καφέ", fee: { $hidden: "amount" } },
  changed: ["name", "fee"],
  ...overrides,
});

const options: AuditOptions = {
  areas: [{ code: "sales", label: "Πωλήσεις" }],
  entities: [{ code: "clients", label: "Πελάτης", area: "sales" }],
  actors: [{ id: CLIENT, name: "Άννα Δημητρίου" }],
};

describe("p1RowOf", () => {
  it("should name the subject, link its page and mark hidden values", () => {
    const row = p1RowOf(item());
    expect(row).toMatchObject({
      id: 7,
      title: "Πελάτης «Κυψέλη Καφέ»",
      href: `/app/clients/${CLIENT}`,
      actor: "Άννα Δημητρίου",
      area: "Πωλήσεις",
      action: "αλλαγή",
      more: null,
    });
    expect(row.changes).toEqual([
      {
        key: "name",
        before: { text: "Κυψέλη", isHidden: false },
        after: { text: "Κυψέλη Καφέ", isHidden: false },
      },
      {
        key: "fee",
        before: { text: "κρυφό ποσό", isHidden: true },
        after: { text: "κρυφό ποσό", isHidden: true },
      },
    ]);
  });

  it("should keep three change lines and count the rest", () => {
    const row = p1RowOf(
      item({
        action: "insert",
        before: null,
        after: { a: 1, b: 2, c: 3, d: 4, e: 5 },
        changed: null,
        entityId: "not-a-uuid",
        subject: null,
      }),
    );
    expect(row.changes).toHaveLength(3);
    expect(row.changes[0]).toEqual({
      key: "a",
      before: null,
      after: { text: "1", isHidden: false },
    });
    expect(row.more).toBe("+2 ακόμα");
    expect(row.href).toBeUndefined();
    expect(row.title).toBe("Πελάτης");
  });
});

describe("p1When", () => {
  it("should leave an unreadable stamp as it is", () => {
    expect(p1When("χθες")).toBe("χθες");
  });
});

describe("p1ChipsOf", () => {
  it("should name each active filter and drop it in its link", () => {
    const chips = p1ChipsOf(
      { who: "system", area: "sales", period: "7d" },
      options,
      null,
    );
    expect(chips.map((chip) => chip.text)).toEqual([
      "Ποιος: Σύστημα",
      "Περιοχή: Πωλήσεις",
      "Περίοδος: 7 μέρες",
    ]);
    expect(chips[0]?.href).toBe("/app/audit?area=sales&period=7d");
  });

  it("should show the named subject of a history link", () => {
    const chips = p1ChipsOf(
      { entity: "clients", id: CLIENT, period: "all" },
      options,
      { label: "Πελάτης", name: "Κυψέλη Καφέ" },
    );
    expect(chips).toEqual([
      {
        key: "entity",
        label: "Στοιχείο",
        text: "Στοιχείο: Πελάτης «Κυψέλη Καφέ»",
        href: "/app/audit",
      },
    ]);
  });
});
