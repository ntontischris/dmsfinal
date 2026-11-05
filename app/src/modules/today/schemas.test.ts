import { describe, expect, it } from "vitest";

import { moved, toggled } from "./customize-model";
import { prefsSchema } from "./schemas";
import {
  parseCardData,
  parseTodayCounts,
  parseTodayMoney,
  parseTodayProgramme,
  parseTodayTeam,
} from "./view-schema";

describe("prefsSchema", () => {
  it("should accept card codes", () => {
    expect(prefsSchema.safeParse({ order: ["health", "readiness"], hidden: [] }).success).toBe(true);
  });

  it("should reject a malformed code", () => {
    expect(prefsSchema.safeParse({ order: ["Health; drop"], hidden: [] }).success).toBe(false);
  });

  it("should reject too many codes", () => {
    const order = Array.from({ length: 101 }, (_, index) => `c${index}`);
    expect(prefsSchema.safeParse({ order, hidden: [] }).success).toBe(false);
  });
});

describe("view schemas", () => {
  const counts = {
    cards: [
      { code: "health", grp: "health", kind: "health", label: "Υγεία συστήματος",
        link: "/app/settings/sends?tab=failed", count: 0, failed: false, hidden: false },
    ],
    unread_notifications: 3,
    customized: true,
  };

  it("should turn the counts into camelCase", () => {
    const parsed = parseTodayCounts(counts);
    expect(parsed.unreadNotifications).toBe(3);
    expect(parsed.isCustomized).toBe(true);
  });

  it("should reject a card link outside the app", () => {
    const bad = { ...counts, cards: [{ ...counts.cards[0], link: "https://evil.example.com" }] };
    expect(() => parseTodayCounts(bad)).toThrow();
  });

  it("should read card items with an optional amount", () => {
    const data = parseCardData({
      code: "health",
      count: 1,
      items: [{ id: "job:outbox", title: "Δεν έτρεξε", subtitle: null, at: null, urgent: true, link: "/app/settings/sends" }],
    });
    expect(data.items[0]).toMatchObject({ amountCents: null, urgent: true });
  });

  it("should fall back to the id when an item has no title", () => {
    const data = parseCardData({
      code: "readiness",
      count: 1,
      items: [{ id: "logo", urgent: false, link: "/app/settings/readiness" }],
    });
    expect(data.items[0]).toMatchObject({ title: "logo", subtitle: null, at: null });
  });

  it("should read when a decision started waiting and whether its slot is free", () => {
    const data = parseCardData({
      code: "filming_approvals",
      count: 1,
      items: [
        {
          id: "booking:f1",
          title: "Πελάτης: κράτηση",
          at: "2026-11-10T15:00:00+00:00",
          waiting_since: "2026-11-02T10:00:00+00:00",
          slot_free: true,
          urgent: false,
          link: "/app/filming/queue",
        },
      ],
    });
    expect(data.items[0]).toMatchObject({ waitingSince: "2026-11-02T10:00:00+00:00", isSlotFree: true });
  });
});

describe("briefing parts (PRD 241)", () => {
  it("should read the money part in camelCase", () => {
    const money = parseTodayMoney({
      overdue_cents: 52400,
      overdue_count: 2,
      client_count: 2,
      debtors: [{ client_id: "c2", name: "Κίνηση", amount_cents: 40000, days: 18, link: "/app/finance/ledger?client=c2" }],
      month: { month: 3, day: 10, days: 31, collected_cents: 5000, expected_cents: 82400 },
    });
    expect(money.debtors[0]).toEqual({ id: "c2", name: "Κίνηση", amountCents: 40000, days: 18, link: "/app/finance/ledger?client=c2" });
    expect(money.month).toEqual({ month: 3, day: 10, days: 31, collectedCents: 5000, expectedCents: 82400 });
  });

  it("should reject a debtor link outside the app", () => {
    expect(() =>
      parseTodayMoney({
        overdue_cents: 1, overdue_count: 1, client_count: 1,
        debtors: [{ client_id: "c", name: "x", amount_cents: 1, days: 1, link: "https://example.com" }],
        month: { month: 3, day: 10, days: 31, collected_cents: 0, expected_cents: 0 },
      }),
    ).toThrow();
  });

  it("should read the team and the programme", () => {
    const team = parseTodayTeam({
      people: [{ user_id: "u1", name: "Πέτρος", late: 2, oldest_days: 5, steps: 0, versions: 0 }],
      fine: 3,
      sees: { deliverables: true, steps: true, versions: true },
    });
    expect(team.people[0]).toEqual({ id: "u1", name: "Πέτρος", late: 2, oldestDays: 5, steps: 0, versions: 0 });
    const programme = parseTodayProgramme({
      day: "2026-03-10",
      items: [{ id: "f1", title: "Αθηνά, Κατάστημα", at: "2026-03-10T08:00:00+00:00", hours: 2, subtitle: null, crew: ["Πέτρος"], link: "/app/filming/f1" }],
    });
    expect(programme.items[0]?.crew).toEqual(["Πέτρος"]);
  });
});

describe("customize model", () => {
  it("should move a card one step without touching the others", () => {
    expect(moved(["a", "b", "c"], "c", -1)).toEqual(["a", "c", "b"]);
    expect(moved(["a", "b"], "a", -1)).toEqual(["a", "b"]);
  });

  it("should toggle a hidden card", () => {
    expect(toggled(["a"], "a")).toEqual([]);
    expect(toggled([], "a")).toEqual(["a"]);
  });
});
