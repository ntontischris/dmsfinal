import { describe, expect, it } from "vitest";

import { toCell, toSheet, valueAt, type ExportColumn } from "./columns";

const COLUMNS: readonly ExportColumn[] = [
  { key: "clientName", header: "Πελάτης", type: "text" },
  { key: "buckets.1", header: "1–30", type: "money" },
  { key: "total", header: "Σύνολο", type: "money" },
  { key: "oldestDue", header: "Λήξη", type: "date" },
];

describe("valueAt", () => {
  it("should follow dotted paths through objects and arrays", () => {
    const row = { a: { b: [10, 20] } };
    expect(valueAt(row, "a.b.1")).toBe(20);
    expect(valueAt(row, "a.c")).toBeUndefined();
    expect(valueAt(null, "a")).toBeUndefined();
  });
});

describe("toCell", () => {
  it("should keep numbers for numeric columns and read numeric strings", () => {
    expect(toCell(12.5, "money")).toBe(12.5);
    expect(toCell("124.00", "money")).toBe(124);
    expect(toCell("όχι", "money")).toBeNull();
    expect(toCell("", "integer")).toBeNull();
  });

  it("should keep only real dates and months", () => {
    expect(toCell("2026-03-15", "date")).toBe("2026-03-15");
    expect(toCell("2026-03-15T08:00:00+00:00", "date")).toBe("2026-03-15");
    expect(toCell("15/03/2026", "date")).toBeNull();
    expect(toCell("2026-03", "month")).toBe("2026-03");
    expect(toCell("2026-3", "month")).toBeNull();
  });

  it("should turn null and missing values into empty cells", () => {
    expect(toCell(null, "money")).toBeNull();
    expect(toCell(undefined, "text")).toBeNull();
    expect(toCell({ x: 1 }, "text")).toBeNull();
    expect(toCell(3, "text")).toBe("3");
  });
});

describe("toSheet", () => {
  it("should build rows from the JSON rows and the columns", () => {
    const sheet = toSheet("Οφειλές", COLUMNS, [
      {
        clientName: "Α",
        buckets: [0, 100, 0],
        total: 100,
        oldestDue: "2026-01-10",
      },
      { clientName: "Β", buckets: [null, null], total: null, oldestDue: null },
    ]);
    expect(sheet.columns).toEqual(
      COLUMNS.map(({ header, type }) => ({ header, type })),
    );
    expect(sheet.rows).toEqual([
      ["Α", 100, 100, "2026-01-10"],
      ["Β", null, null, null],
    ]);
  });

  it("should add a totals row with its label in the first empty column", () => {
    const sheet = toSheet("Οφειλές", COLUMNS, [], {
      values: { buckets: [0, 5], total: 5 },
      label: "Σύνολο",
    });
    expect(sheet.rows).toEqual([["Σύνολο", 5, 5, null]]);
  });

  it("should put Greek words in place of database codes", () => {
    const columns: readonly ExportColumn[] = [
      { key: "outcome", header: "Έκβαση", type: "text", labels: { won: "Κερδισμένη" } },
    ];
    expect(toSheet("Χ", columns, [{ outcome: "won" }, { outcome: "other" }, {}]).rows).toEqual([
      ["Κερδισμένη"],
      ["other"],
      [null],
    ]);
  });
});
