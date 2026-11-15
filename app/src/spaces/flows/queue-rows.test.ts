import { describe, expect, it } from "vitest";

import type { JobDigest } from "./digests";
import { flowOf } from "./flows";
import type { Parked } from "./parked";
import {
  daySentence,
  digestTitle,
  parkedTitle,
  queueHeader,
  queueOf,
  rowsOf,
} from "./queue-rows";

const HOUR = 3_600_000;
// Κυριακή 15/11/2026, 12:00 Αθήνα.
const NOW = Date.UTC(2026, 10, 15, 10);
const iso = (ms: number) => new Date(ms).toISOString();

const apanto = (count: number, sinceMs = NOW - 3 * HOUR): JobDigest => ({
  job: "apanto-se-pelates",
  count,
  oldest: {
    who: "Πελάτης Α",
    since: iso(sinceMs),
    day: null,
    href: "/app/messages/c1",
  },
});

const egkrino = (count: number, sinceMs = NOW - 2 * HOUR): JobDigest => ({
  job: "egkrino-gyrismata",
  count,
  oldest: {
    who: "Ταβέρνα Χ",
    since: iso(sinceMs),
    day: "2026-11-16T09:00:00Z",
    href: "/app/filming/f1",
  },
});

const parked = (over: Partial<Parked> = {}): Parked => ({
  job: "stino-gyrisma",
  step: 3,
  reason: "exit",
  at: NOW - HOUR,
  ...over,
});

describe("digestTitle", () => {
  it("should word apanto by its queue rule", () => {
    expect(digestTitle(apanto(3), NOW)).toBe(
      "Απαντώ σε Πελάτες — 3 σε περιμένουν (ο πιο παλιός: Πελάτης Α, πριν από 3 ώρες)",
    );
    expect(digestTitle(apanto(1), NOW)).toContain("— 1 σε περιμένει (");
  });

  it("should word egkrino with the filming day", () => {
    const title = digestTitle(egkrino(2), NOW);
    expect(title).toMatch(
      /^Αιτήματα γυρίσματος — 2 περιμένουν απάντηση \(παλαιότερο: Ταβέρνα Χ, .*16\/11\)$/,
    );
    expect(digestTitle({ ...egkrino(1), oldest: null }, NOW)).toBe(
      "Αιτήματα γυρίσματος — 1 περιμένει απάντηση",
    );
  });
});

describe("parkedTitle", () => {
  it("should say what continues after an exit or a wait", () => {
    const flow = flowOf("egkrino-gyrismata")!;
    expect(parkedTitle(flow, parked({ job: flow.id, step: 4 }))).toBe(
      "Αιτήματα γυρίσματος — συνέχισε: Γιατί λες όχι;",
    );
    const stino = flowOf("stino-gyrisma")!;
    expect(parkedTitle(stino, parked({ reason: "wait", step: 5 }))).toContain(
      "περιμένουμε την ομάδα· μετά:",
    );
  });
});

describe("rowsOf", () => {
  it("should give one row per job, the half-done one in place of its queue rule", () => {
    const rows = rowsOf({
      digests: [egkrino(2), apanto(1)],
      parked: [
        parked({ job: "egkrino-gyrismata", step: 4, at: NOW - 5 * HOUR }),
      ],
      later: {},
      now: NOW,
    });
    expect(rows.map((row) => row.key)).toEqual([
      "egkrino-gyrismata",
      "apanto-se-pelates",
    ]);
    expect(rows[0].parked).not.toBeNull();
    expect(rows[0].sub).toBe("Βήμα 2γ από 3: Γιατί λες όχι;");
  });

  it("should drop a queue rule with nothing waiting", () => {
    expect(
      rowsOf({ digests: [apanto(0)], parked: [], later: {}, now: NOW }),
    ).toEqual([]);
  });

  it("should order rows oldest first", () => {
    const rows = rowsOf({
      digests: [egkrino(1, NOW - HOUR), apanto(1, NOW - 4 * HOUR)],
      parked: [],
      later: {},
      now: NOW,
    });
    expect(rows.map((row) => row.key)).toEqual([
      "apanto-se-pelates",
      "egkrino-gyrismata",
    ]);
    expect(rows[1].href).toBe(
      "/app/filming/queue?job=egkrino-gyrismata&step=1",
    );
  });
});

describe("queueOf", () => {
  const input = {
    digests: [apanto(2, NOW - 30 * HOUR), egkrino(1)],
    parked: [parked()],
    now: NOW,
  };

  it("should split today from yesterday", () => {
    const queue = queueOf({ ...input, later: {} });
    expect(queue.fromYesterday.map((row) => row.key)).toEqual([
      "apanto-se-pelates",
    ]);
    expect(queue.today.map((row) => row.key)).toEqual([
      "egkrino-gyrismata",
      "stino-gyrisma",
    ]);
    expect(queueHeader(queue)).toBe(
      "Τι πρέπει να κάνω τώρα — 2 για σήμερα, 1 από χθες",
    );
  });

  it("should hide postponed rows until their time", () => {
    const queue = queueOf({
      ...input,
      later: { "stino-gyrisma": NOW + HOUR, "egkrino-gyrismata": NOW - 1 },
    });
    expect(queue.today.map((row) => row.key)).toEqual(["egkrino-gyrismata"]);
    expect(queue.postponed).toEqual([
      {
        row: expect.objectContaining({ key: "stino-gyrisma" }),
        until: NOW + HOUR,
      },
    ]);
  });
});

describe("daySentence", () => {
  it("should report closed and postponed counts", () => {
    expect(daySentence(2, 1)).toContain(
      "έκλεισες 2 σήμερα, 1 περιμένουν στο «Αργότερα»",
    );
  });
});
