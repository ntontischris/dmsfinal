import { strFromU8, unzipSync } from "fflate";
import { describe, expect, it } from "vitest";

import type { ExportSheet } from "./columns";
import {
  buildXlsx,
  cellXml,
  columnName,
  escapeXml,
  excelDate,
  sheetNames,
  xlsxParts,
} from "./xlsx";

const SHEET: ExportSheet = {
  name: "Τιμολόγια",
  columns: [
    { header: "Αριθμός", type: "text" },
    { header: "Έκδοση", type: "date" },
    { header: "Σύνολο", type: "money" },
    { header: "Τιμολόγια", type: "integer" },
    { header: "Μερίδιο", type: "percent" },
    { header: "Μήνας", type: "month" },
  ],
  rows: [
    ['A-1 & <Υιοί> "Ο\'Κ"', "2026-03-15", 1240.5, 3, 0.25, "2026-03"],
    [null, null, -50, null, null, null],
  ],
};

const unzip = (bytes: Uint8Array): Record<string, string> =>
  Object.fromEntries(
    Object.entries(unzipSync(bytes)).map(([path, data]) => [
      path,
      strFromU8(data),
    ]),
  );

describe("buildXlsx", () => {
  it("should produce a zip with the OOXML parts Excel needs", () => {
    const files = unzip(buildXlsx([SHEET]));
    expect(Object.keys(files).sort()).toEqual([
      "[Content_Types].xml",
      "_rels/.rels",
      "xl/_rels/workbook.xml.rels",
      "xl/styles.xml",
      "xl/workbook.xml",
      "xl/worksheets/sheet1.xml",
    ]);
    expect(files["[Content_Types].xml"]).toContain(
      'PartName="/xl/worksheets/sheet1.xml"',
    );
    expect(files["_rels/.rels"]).toContain('Target="xl/workbook.xml"');
    expect(files["xl/_rels/workbook.xml.rels"]).toContain(
      'Target="worksheets/sheet1.xml"',
    );
    expect(files["xl/_rels/workbook.xml.rels"]).toContain(
      'Target="styles.xml"',
    );
    expect(files["xl/workbook.xml"]).toContain(
      '<sheet name="Τιμολόγια" sheetId="1" r:id="rId1"/>',
    );
  });

  it("should write one worksheet per sheet, with matching relationships", () => {
    const files = unzip(buildXlsx([SHEET, { ...SHEET, name: "Εισπράξεις" }]));
    expect(files["xl/worksheets/sheet2.xml"]).toBeDefined();
    expect(files["xl/workbook.xml"]).toContain(
      '<sheet name="Εισπράξεις" sheetId="2" r:id="rId2"/>',
    );
    expect(files["xl/_rels/workbook.xml.rels"]).toContain('Id="rId3"');
    expect(files["[Content_Types].xml"]).toContain(
      'PartName="/xl/worksheets/sheet2.xml"',
    );
  });

  it("should write Greek headers in bold in row 1 and freeze it", () => {
    const xml = xlsxParts([SHEET])["xl/worksheets/sheet1.xml"];
    expect(xml).toContain(
      '<c r="A1" t="inlineStr" s="1"><is><t xml:space="preserve">Αριθμός</t></is></c>',
    );
    expect(xml).toContain('state="frozen"');
  });

  it("should write numbers as numbers and dates as real dates with a format", () => {
    const xml = xlsxParts([SHEET])["xl/worksheets/sheet1.xml"];
    expect(xml).toContain('<c r="C2" s="3"><v>1240.5</v></c>');
    expect(xml).toContain('<c r="D2" s="2"><v>3</v></c>');
    expect(xml).toContain('<c r="E2" s="4"><v>0.25</v></c>');
    expect(xml).toContain(
      `<c r="B2" s="5"><v>${excelDate("2026-03-15")}</v></c>`,
    );
    expect(xml).toContain(
      `<c r="F2" s="6"><v>${excelDate("2026-03-01")}</v></c>`,
    );
    expect(xml).toContain('<c r="C3" s="3"><v>-50</v></c>');
  });

  it("should escape & < > and quotes inside text", () => {
    const xml = xlsxParts([SHEET])["xl/worksheets/sheet1.xml"];
    expect(xml).toContain("A-1 &amp; &lt;Υιοί&gt; &quot;Ο&apos;Κ&quot;");
  });

  it("should leave empty cells out and still write their rows", () => {
    const xml = xlsxParts([SHEET])["xl/worksheets/sheet1.xml"];
    expect(xml).toContain('<row r="3"><c r="C3"');
    expect(xml).not.toContain('r="A3"');
  });

  it("should write an empty dataset as a header row only", () => {
    const xml = xlsxParts([{ ...SHEET, rows: [] }])["xl/worksheets/sheet1.xml"];
    expect(xml).toContain('<row r="1">');
    expect(xml).not.toContain('<row r="2">');
  });

  it("should still write a valid workbook without any sheet", () => {
    const files = unzip(buildXlsx([]));
    expect(files["xl/workbook.xml"]).toContain('sheetId="1"');
    expect(files["xl/worksheets/sheet1.xml"]).toContain("<sheetData>");
  });

  it("should declare the number formats it uses", () => {
    const styles = xlsxParts([SHEET])["xl/styles.xml"];
    expect(styles).toContain('formatCode="dd/mm/yyyy"');
    expect(styles).toContain('formatCode="mm/yyyy"');
    expect(styles).toContain('<cellXfs count="8">');
  });
});

describe("excelDate", () => {
  it("should count days like Excel does", () => {
    expect(excelDate("1900-03-01")).toBe(61);
    expect(excelDate("2026-01-01")).toBe(46023);
    expect(excelDate("2026-03-15T10:00:00+02:00")).toBe(46096);
  });
});

describe("columnName", () => {
  it("should name columns A..Z, AA..", () => {
    expect([0, 25, 26, 27, 51, 52, 701, 702].map(columnName)).toEqual([
      "A",
      "Z",
      "AA",
      "AB",
      "AZ",
      "BA",
      "ZZ",
      "AAA",
    ]);
  });
});

describe("escapeXml", () => {
  it("should drop characters XML 1.0 does not allow", () => {
    expect(escapeXml("α\u0001β\u000Bγ\tδ\n")).toBe("αβγ\tδ\n");
  });
});

describe("sheetNames", () => {
  it("should keep names valid and unique for Excel", () => {
    expect(
      sheetNames(["Τιμολόγια", "τιμολόγια", "Α/Β:Γ?*[x]", "", "'Quoted'"]),
    ).toEqual(["Τιμολόγια", "τιμολόγια (2)", "Α Β Γ   x", "Φύλλο", "Quoted"]);
    expect(
      sheetNames(["Ένα πολύ μεγάλο όνομα φύλλου που ξεπερνά τα όρια"])[0],
    ).toHaveLength(31);
  });
});

describe("cellXml", () => {
  it("should keep a text label in a numeric column as text", () => {
    expect(cellXml("A9", "Σύνολο", "month")).toContain('t="inlineStr"');
    expect(cellXml("A9", "Σύνολο", "money")).toContain('t="inlineStr"');
  });

  it("should write nothing for empty values", () => {
    expect(cellXml("A1", null, "money")).toBe("");
    expect(cellXml("A1", "", "text")).toBe("");
  });
});
