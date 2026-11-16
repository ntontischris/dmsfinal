import { describe, expect, it } from "vitest";

import type { QueueRow } from "./queue-rows";
import { isActionType, noticeRowsOf, parseNotices } from "./today-notices";

const NOW = Date.parse("2026-11-15T10:00:00Z");
const ID_A = "9b2c1d3e-0000-4000-8000-00000000000a";
const ID_B = "9b2c1d3e-0000-4000-8000-00000000000b";
const PROPOSAL = "9b2c1d3e-0000-4000-8000-0000000000aa";

const notice = (over: Record<string, unknown> = {}) => ({
  id: ID_A,
  title: "Η Πρόταση ζητά έγκριση",
  body: null,
  link: `/app/proposals/${PROPOSAL}`,
  createdAt: "2026-11-15T09:00:00Z",
  isRead: false,
  type: "proposal.approval_requested",
  ...over,
});

const row = (over: Partial<QueueRow> = {}): QueueRow => ({
  key: "money_overdue:x",
  title: "Κάρτα",
  sub: "",
  area: "Χρήματα",
  href: "/app/invoices",
  since: NOW,
  hasSince: true,
  amountCents: null,
  isNew: false,
  parked: null,
  ...over,
});

const rowsOf = (items: unknown[], taken: QueueRow[] = []) =>
  noticeRowsOf(parseNotices({ items }), taken, NOW);

describe("isActionType", () => {
  it("should keep fixed action types and drop information or missing types", () => {
    expect(isActionType("invoice.overdue")).toBe(true);
    expect(isActionType("holiday.greeting")).toBe(false);
    expect(isActionType("message.created")).toBe(false);
    expect(isActionType(undefined)).toBe(false);
  });
});

describe("noticeRowsOf", () => {
  it("should make a row for a notice that asks for action", () => {
    const [only] = rowsOf([notice()]);
    expect(only).toMatchObject({
      key: `notice:/app/proposals/${PROPOSAL}`,
      area: "Πελάτες",
      href: `/app/proposals/${PROPOSAL}`,
      noticeIds: [ID_A],
    });
  });

  it("should show nothing while the database gives no type", () => {
    expect(rowsOf([notice({ type: undefined })])).toEqual([]);
  });

  it("should skip a notice whose thing already has a card row", () => {
    const taken = [row({ key: `proposal_approvals:${PROPOSAL}` })];
    expect(rowsOf([notice()], taken)).toEqual([]);
    expect(
      rowsOf([notice()], [row({ href: `/app/proposals/${PROPOSAL}?x=1` })]),
    ).toEqual([]);
  });

  it("should merge notices about the same thing into one row", () => {
    const rows = rowsOf([
      notice({ id: ID_B, title: "Νεότερη" }),
      notice({ createdAt: "2026-11-15T08:00:00Z" }),
    ]);
    expect(rows).toHaveLength(1);
    expect(rows[0].noticeIds).toEqual([ID_B, ID_A]);
    expect(rows[0].title).toMatch(/^Νεότερη \(2\)/);
    expect(rows[0].since).toBe(Date.parse("2026-11-15T08:00:00Z"));
  });

  it("should list nothing when the read has an unknown shape", () => {
    expect(parseNotices({ nope: true })).toEqual([]);
  });
});
