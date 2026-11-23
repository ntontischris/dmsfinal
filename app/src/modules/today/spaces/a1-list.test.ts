import { describe, expect, it } from "vitest";

import type { Built } from "./a1-adapter";
import type { CardRow } from "./a1-model";
import { listOf, remainingOf, type ListGroup } from "./a1-list";

const STAMP = "2026-11-24T09:00";

const builtOf = (
  code: string,
  rows: readonly CardRow[],
  count?: number,
): Built => ({
  card: { id: code, title: code, source: "A1", kind: "action" },
  content: {
    count: count ?? rows.length,
    rows,
    allHref: "/x",
    emptyText: "",
  },
});

const rowOf = (label: string, extra: Partial<CardRow> = {}): CardRow => ({
  id: label,
  label,
  href: `/r/${label}`,
  ...extra,
});

const groupIds = (groups: readonly ListGroup[]) => groups.map((g) => g.id);
const labelsOf = (group: ListGroup | undefined) =>
  (group?.lines ?? []).map((line) => line.row.label);
const findGroup = (groups: readonly ListGroup[], id: string) =>
  groups.find((group) => group.id === id);

describe("listOf", () => {
  it("should put each card in its group in the fixed group order", () => {
    const groups = listOf({
      built: [
        builtOf("overdue_invoices", [rowOf("o")]),
        builtOf("unread_messages", [rowOf("u")]),
      ],
      failed: new Set(),
      stamp: STAMP,
    });
    expect(groupIds(groups)).toEqual(["client", "money"]);
  });

  it("should keep the user's card order inside a group", () => {
    const groups = listOf({
      built: [
        builtOf("versions_to_review", [rowOf("v1")]),
        builtOf("unread_messages", [rowOf("u1")]),
      ],
      failed: new Set(),
      stamp: STAMP,
    });
    expect(labelsOf(findGroup(groups, "client"))).toEqual(["v1", "u1"]);
  });

  it("should order urgent first, then oldest waitingSince, then largest amount", () => {
    const groups = listOf({
      built: [
        builtOf("to_invoice", [
          rowOf("a", { amountCents: 100 }),
          rowOf("e", { amountCents: 500 }),
          rowOf("b", { isUrgent: true, amountCents: 50 }),
          rowOf("c", { waitingSince: "2026-11-01T00:00:00Z" }),
          rowOf("d", { waitingSince: "2026-10-01T00:00:00Z" }),
        ]),
      ],
      failed: new Set(),
      stamp: STAMP,
    });
    expect(labelsOf(findGroup(groups, "money"))).toEqual([
      "b",
      "d",
      "c",
      "e",
      "a",
    ]);
  });

  it("should keep only today and tomorrow in week_filming and drop pending-approval rows", () => {
    const groups = listOf({
      built: [
        builtOf("week_filming", [
          rowOf("today", { at: "2026-11-25T10:00" }),
          rowOf("tomorrow", { at: "2026-11-26T10:00" }),
          rowOf("in-three-days", { at: "2026-11-28T10:00" }),
          rowOf("pending", {
            at: "2026-11-25T12:00",
            note: "αναμένει έγκριση",
          }),
        ]),
      ],
      failed: new Set(),
      stamp: "2026-11-25T09:00",
    });
    expect(labelsOf(findGroup(groups, "time"))).toEqual(["today", "tomorrow"]);
  });

  it("should put crew_declined in the externals group", () => {
    const groups = listOf({
      built: [builtOf("crew_declined", [rowOf("c", { isUrgent: true })])],
      failed: new Set(),
      stamp: STAMP,
    });
    expect(groupIds(groups)).toEqual(["externals"]);
    expect(labelsOf(findGroup(groups, "externals"))).toEqual(["c"]);
  });

  it("should put crew_silent in the externals group", () => {
    const groups = listOf({
      built: [builtOf("crew_silent", [rowOf("s", { isUrgent: false })])],
      failed: new Set(),
      stamp: STAMP,
    });
    expect(groupIds(groups)).toEqual(["externals"]);
    expect(labelsOf(findGroup(groups, "externals"))).toEqual(["s"]);
  });

  it("should put filming_no_script in the time group", () => {
    const groups = listOf({
      built: [builtOf("filming_no_script", [rowOf("g", { isUrgent: true })])],
      failed: new Set(),
      stamp: STAMP,
    });
    expect(groupIds(groups)).toEqual(["time"]);
    expect(labelsOf(findGroup(groups, "time"))).toEqual(["g"]);
  });

  it("should put agreement_ending in the keep group", () => {
    const groups = listOf({
      built: [builtOf("agreement_ending", [rowOf("a", { isUrgent: true })])],
      failed: new Set(),
      stamp: STAMP,
    });
    expect(groupIds(groups)).toEqual(["keep"]);
    expect(labelsOf(findGroup(groups, "keep"))).toEqual(["a"]);
  });

  it("should put agreement_signed in the keep group", () => {
    const groups = listOf({
      built: [builtOf("agreement_signed", [rowOf("s")])],
      failed: new Set(),
      stamp: STAMP,
    });
    expect(groupIds(groups)).toEqual(["keep"]);
    expect(labelsOf(findGroup(groups, "keep"))).toEqual(["s"]);
  });

  it("should put equipment_repair in the time group", () => {
    const groups = listOf({
      built: [builtOf("equipment_repair", [rowOf("k", { isUrgent: true })])],
      failed: new Set(),
      stamp: STAMP,
    });
    expect(groupIds(groups)).toEqual(["time"]);
    expect(labelsOf(findGroup(groups, "time"))).toEqual(["k"]);
  });

  it("should put version_late in the externals group", () => {
    const groups = listOf({
      built: [builtOf("version_late", [rowOf("v", { isUrgent: true })])],
      failed: new Set(),
      stamp: STAMP,
    });
    expect(groupIds(groups)).toEqual(["externals"]);
    expect(labelsOf(findGroup(groups, "externals"))).toEqual(["v"]);
  });

  it("should hide group company unless a line is urgent", () => {
    const quiet = listOf({
      built: [builtOf("unanswered", [rowOf("q")])],
      failed: new Set(),
      stamp: STAMP,
    });
    const urgent = listOf({
      built: [builtOf("unanswered", [rowOf("q", { isUrgent: true })])],
      failed: new Set(),
      stamp: STAMP,
    });
    expect(groupIds(quiet)).not.toContain("company");
    expect(groupIds(urgent)).toContain("company");
  });

  it("should show a card that failed as a failed entry of its group", () => {
    const groups = listOf({
      built: [],
      failed: new Set(["to_invoice"]),
      stamp: STAMP,
    });
    const money = findGroup(groups, "money");
    expect(money?.failed).toEqual(["to_invoice"]);
    expect(money?.lines).toEqual([]);
  });

  it("should add a more link when count exceeds loaded rows", () => {
    const rows = Array.from({ length: 10 }, (_, i) => rowOf(`r${i}`));
    const groups = listOf({
      built: [builtOf("to_invoice", rows, 34)],
      failed: new Set(),
      stamp: STAMP,
    });
    expect(findGroup(groups, "money")?.more).toEqual([
      { count: 24, href: "/x" },
    ]);
  });

  it("should drop empty groups", () => {
    const groups = listOf({
      built: [builtOf("my_tasks", [])],
      failed: new Set(),
      stamp: STAMP,
    });
    expect(groups).toEqual([]);
  });

  it("should show a row that sits in two cards only once", () => {
    const shared = rowOf("s", { href: "/p?id=1" });
    const groups = listOf({
      built: [
        builtOf("unread_messages", [shared]),
        builtOf("filming_approvals", [shared]),
      ],
      failed: new Set(),
      stamp: STAMP,
    });
    expect(labelsOf(findGroup(groups, "client"))).toEqual(["s"]);
  });

  it("should show health as one urgent summary line without a later key", () => {
    const groups = listOf({
      built: [builtOf("health", [rowOf("x")], 2)],
      failed: new Set(),
      stamp: STAMP,
    });
    const [line] = findGroup(groups, "company")?.lines ?? [];
    expect(line?.row.label).toBe("Κάτι δεν λειτουργεί");
    expect(line?.laterKey).toBeNull();
    expect(line?.row.isUrgent).toBe(true);
  });

  it("should give week_filming no more link even when its count exceeds loaded rows", () => {
    const groups = listOf({
      built: [
        builtOf("week_filming", [rowOf("t", { at: "2026-11-25T10:00" })], 30),
      ],
      failed: new Set(),
      stamp: "2026-11-25T09:00",
    });
    expect(findGroup(groups, "time")?.more).toEqual([]);
  });

  it("should show the company group with a failed entry when a company card failed", () => {
    const groups = listOf({
      built: [],
      failed: new Set(["health"]),
      stamp: STAMP,
    });
    const company = findGroup(groups, "company");
    expect(company?.failed).toEqual(["health"]);
    expect(company?.lines).toEqual([]);
  });
});

describe("remainingOf", () => {
  it("should count only urgent lines of the company group and no more links", () => {
    const groups = listOf({
      built: [
        builtOf("unanswered", [rowOf("q", { isUrgent: true }), rowOf("p")], 5),
      ],
      failed: new Set(),
      stamp: STAMP,
    });
    expect(remainingOf(groups)).toBe(1);
  });

  it("should count lines of all shown groups plus the more counts", () => {
    const rows = Array.from({ length: 10 }, (_, i) => rowOf(`r${i}`));
    const groups = listOf({
      built: [
        builtOf("unread_messages", [rowOf("u1"), rowOf("u2")]),
        builtOf("to_invoice", rows, 34),
      ],
      failed: new Set(),
      stamp: STAMP,
    });
    expect(remainingOf(groups)).toBe(2 + 10 + 24);
  });
});
