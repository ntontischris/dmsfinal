import { describe, expect, it } from "vitest";

import type { ExportSheet } from "./sheet";
import { buildCsv, csvCell, csvText, toCsv } from "./csv";

const SHEET: ExportSheet = {
  name: "Εισπράξεις",
  columns: [
    { header: "Ημερομηνία", type: "date" },
    { header: "Πελάτης", type: "text" },
    { header: "Ποσό", type: "money" },
    { header: "Πλήθος", type: "integer" },
    { header: "Μερίδιο", type: "percent" },
    { header: "Ώρες", type: "number" },
    { header: "Μήνας", type: "month" },
  ],
  rows: [
    ["2026-03-15", 'Πελάτης; «Α» "Ο"', 1234.5, 3, 0.2534, 120.5, "2026-03"],
    [null, "=SUM(A1)", -12, null, null, null, null],
  ],
};

describe("toCsv", () => {
  it("should start with a BOM and use ; with CRLF lines", () => {
    const csv = toCsv(SHEET);
    expect(csv.charCodeAt(0)).toBe(0xfeff);
    const lines = csv.slice(1).split("\r\n");
    expect(lines[0]).toBe("Ημερομηνία;Πελάτης;Ποσό;Πλήθος;Μερίδιο;Ώρες;Μήνας");
    expect(lines).toHaveLength(3);
  });

  it("should write Greek decimals, dates and months the Greek Excel reads", () => {
    const line = toCsv(SHEET).split("\r\n")[1];
    expect(line).toBe(
      '15/03/2026;"Πελάτης; «Α» ""Ο""";1234,50;3;25,34%;120,5;03/2026',
    );
  });

  it("should keep negative amounts as numbers and guard formulas in text", () => {
    const line = toCsv(SHEET).split("\r\n")[2];
    expect(line).toBe(";'=SUM(A1);-12,00;;;;");
  });

  it("should write only the header for an empty dataset", () => {
    expect(toCsv({ ...SHEET, rows: [] })).toBe(
      "﻿Ημερομηνία;Πελάτης;Ποσό;Πλήθος;Μερίδιο;Ώρες;Μήνας",
    );
  });

  it("should encode as UTF-8 with the BOM bytes first", () => {
    const bytes = buildCsv(SHEET);
    expect([...bytes.slice(0, 3)]).toEqual([0xef, 0xbb, 0xbf]);
    expect(new TextDecoder().decode(bytes.slice(3, 23))).toBe("Ημερομηνία");
  });
});

describe("csvText", () => {
  it("should quote separators, quotes and line breaks", () => {
    expect(csvText("α;β")).toBe('"α;β"');
    expect(csvText("α,β")).toBe('"α,β"');
    expect(csvText('λέξη "μία"')).toBe('"λέξη ""μία"""');
    expect(csvText("α\nβ")).toBe('"α\nβ"');
    expect(csvText("α\r\nβ")).toBe('"α\r\nβ"');
  });

  it("should prefix text that Excel would run as a formula", () => {
    expect(csvText("+30 210")).toBe("'+30 210");
    expect(csvText("-")).toBe("'-");
    expect(csvText("@cmd")).toBe("'@cmd");
    expect(csvText("\tx")).toBe("'\tx");
    expect(csvText("απλό")).toBe("απλό");
  });
});

describe("csvCell", () => {
  it("should leave a text label in a date or month column as text", () => {
    expect(csvCell("Σύνολο", "date")).toBe("Σύνολο");
    expect(csvCell("Σύνολο", "month")).toBe("Σύνολο");
  });

  it("should round integers and keep money at two decimals", () => {
    expect(csvCell(2.6, "integer")).toBe("3");
    expect(csvCell(0.1 + 0.2, "money")).toBe("0,30");
    expect(csvCell(0.1 + 0.2, "number")).toBe("0,3");
    expect(csvCell(1, "percent")).toBe("100%");
  });
});
