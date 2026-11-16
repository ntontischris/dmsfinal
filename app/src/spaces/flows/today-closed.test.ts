import { describe, expect, it } from "vitest";

import { closedOf, type AuditEntry } from "./today-closed";

// Μεσάνυχτα 15/11/2026 στην Αθήνα.
const DAY_START = Date.UTC(2026, 10, 14, 22);
const at = (hours: number) =>
  new Date(DAY_START + hours * 3_600_000).toISOString();

const entry = (over: Partial<AuditEntry> = {}): AuditEntry => ({
  id: 1,
  at: at(5),
  action: "update",
  entity: "message_requests",
  entityLabel: "Αίτημα",
  entityId: "r1",
  subject: "Απόδειξη — Κτήμα",
  before: { state: "open" },
  after: { state: "done" },
  ...over,
});

describe("closedOf", () => {
  it("should count a request I closed today", () => {
    expect(closedOf([entry()], DAY_START)).toEqual([
      {
        key: "message_requests:r1",
        title: "Αίτημα: Απόδειξη — Κτήμα",
        at: Date.parse(at(5)),
      },
    ]);
  });

  it("should give one line per thing, however many changes", () => {
    const items = closedOf(
      [entry({ id: 2, at: at(6) }), entry({ id: 1, at: at(5) })],
      DAY_START,
    );
    expect(items).toHaveLength(1);
    expect(items[0].at).toBe(Date.parse(at(6)));
  });

  it("should skip yesterday and changes that close nothing", () => {
    expect(
      closedOf(
        [
          entry({ at: at(-1) }),
          entry({
            id: 3,
            entityId: "r2",
            before: { state: "done" },
            after: { state: "done" },
          }),
          entry({ id: 4, entity: "clients", entityId: "c1" }),
        ],
        DAY_START,
      ),
    ).toEqual([]);
  });

  it("should word filmings, tasks and new receipts", () => {
    const titles = closedOf(
      [
        entry({
          id: 5,
          at: at(7),
          entity: "filmings",
          entityId: "f1",
          subject: "Ταβέρνα",
          before: { state: "pending" },
          after: { state: "rejected" },
        }),
        entry({
          id: 6,
          at: at(6),
          entity: "production_tasks",
          entityId: "t1",
          subject: "Μοντάζ",
          before: { done_at: null },
          after: { done_at: at(6) },
        }),
        entry({
          id: 7,
          at: at(5),
          action: "insert",
          entity: "receipts",
          entityId: "x1",
          subject: null,
          entityLabel: "Απόδειξη",
          before: null,
          after: {},
        }),
      ],
      DAY_START,
    ).map((item) => item.title);
    expect(titles).toEqual([
      "Γύρισμα απορρίφθηκε: Ταβέρνα",
      "Εργασία: Μοντάζ",
      "Απόδειξη: Απόδειξη",
    ]);
  });
});
