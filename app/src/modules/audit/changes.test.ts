import { describe, expect, it } from "vitest";

import { changeLines, hiddenKind, lineText, valueText } from "./changes";
import { ACTION_LABELS, HIDDEN_LABELS, PERIOD_LABELS } from "./labels";
import { pageHref } from "./links";
import type { AuditItem } from "./schema";
import { actionText, auditSheet, subjectText } from "./sheet";

const item = (overrides: Partial<AuditItem>): AuditItem => ({
  id: 1,
  at: "2030-01-14T09:00:00+00:00",
  actorId: null,
  actorName: "Σύστημα",
  action: "update",
  entity: "catalogue_item_amounts",
  entityLabel: "Τιμή στοιχείου Καταλόγου",
  area: "catalogue",
  areaLabel: "Κατάλογος",
  parent: "catalogue_items",
  entityId: "00000000-0000-0000-0000-0000000000e1",
  subject: null,
  before: null,
  after: null,
  changed: null,
  ...overrides,
});

const HIDDEN_AMOUNT = { $hidden: "amount" };

describe("labels", () => {
  it("should name the four kinds of action in Greek", () => {
    expect(ACTION_LABELS).toEqual({
      insert: "προσθήκη",
      update: "αλλαγή",
      delete: "διαγραφή",
      event: "ενέργεια",
    });
  });

  it("should name the three periods and the two hidden markers", () => {
    expect(Object.values(PERIOD_LABELS)).toEqual([
      "7 μέρες",
      "30 μέρες",
      "Όλο",
    ]);
    expect(HIDDEN_LABELS).toEqual({
      amount: "κρυφό ποσό",
      cost: "κρυφό κόστος",
    });
  });

  it("should add the event name to an action", () => {
    expect(
      actionText(item({ action: "event", after: { event: "corrected" } })),
    ).toBe("ενέργεια (corrected)");
    expect(actionText(item({ action: "insert" }))).toBe("προσθήκη");
  });
});

describe("hidden values", () => {
  it("should recognise only the two markers of the database", () => {
    expect(hiddenKind(HIDDEN_AMOUNT)).toBe("amount");
    expect(hiddenKind({ $hidden: "cost" })).toBe("cost");
    expect(hiddenKind({ $hidden: "salary" })).toBeNull();
    expect(hiddenKind("κρυφό")).toBeNull();
  });

  it("should show a marker as words, also inside a list of changes", () => {
    expect(valueText(HIDDEN_AMOUNT)).toBe("κρυφό ποσό");
    expect(valueText([{ field: "total", from: HIDDEN_AMOUNT }])).toBe(
      '[{"field":"total","from":"κρυφό ποσό"}]',
    );
    expect(valueText(null)).toBe("—");
  });
});

describe("changeLines", () => {
  it("should show only what changed in an update, hidden or not", () => {
    const lines = changeLines(
      item({
        before: { price: HIDDEN_AMOUNT, updated_at: "a", note: "x" },
        after: { price: HIDDEN_AMOUNT, updated_at: "b", note: "x" },
        changed: ["price", "updated_at"],
      }),
    );
    expect(lines.map(lineText)).toEqual(["price: κρυφό ποσό → κρυφό ποσό"]);
  });

  it("should show the new row of an insert and the old row of a delete", () => {
    expect(
      changeLines(item({ action: "insert", after: { name: "Νέο" } })).map(
        lineText,
      ),
    ).toEqual(["name: Νέο"]);
    expect(
      changeLines(item({ action: "delete", before: { name: "Παλιό" } })),
    ).toEqual([{ key: "name", before: "Παλιό" }]);
  });
});

describe("links and the export sheet", () => {
  it("should link a child row to its parent page", () => {
    expect(pageHref(item({}))).toBe(
      "/app/catalogue/00000000-0000-0000-0000-0000000000e1",
    );
    expect(
      pageHref(item({ entity: "bank_accounts", parent: null })),
    ).toBeNull();
  });

  it("should write one row per action with Athens time and hidden values as words", () => {
    const sheet = auditSheet([
      item({
        subject: "Reel",
        before: { price: HIDDEN_AMOUNT },
        after: { price: HIDDEN_AMOUNT },
        changed: ["price"],
      }),
    ]);
    expect(sheet.columns.map((c) => c.header)).toEqual([
      "Πότε",
      "Ποιος",
      "Περιοχή",
      "Στοιχείο",
      "Κωδικός στοιχείου",
      "Ενέργεια",
      "Αλλαγές",
      "Πριν",
      "Μετά",
    ]);
    expect(sheet.rows[0]).toEqual([
      "2030-01-14 11:00:00",
      "Σύστημα",
      "Κατάλογος",
      "Τιμή στοιχείου Καταλόγου «Reel»",
      "00000000-0000-0000-0000-0000000000e1",
      "αλλαγή",
      "price: κρυφό ποσό → κρυφό ποσό",
      '{"price":"κρυφό ποσό"}',
      '{"price":"κρυφό ποσό"}',
    ]);
    expect(JSON.stringify(sheet)).not.toContain("$hidden");
  });

  it("should name the element with or without its own name", () => {
    expect(subjectText(item({}))).toBe("Τιμή στοιχείου Καταλόγου");
    expect(subjectText(item({ subject: "Reel" }))).toBe(
      "Τιμή στοιχείου Καταλόγου «Reel»",
    );
  });
});
