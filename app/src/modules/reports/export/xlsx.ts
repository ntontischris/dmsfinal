import { strToU8, zipSync, type Zippable } from "fflate";

import type { Cell, CellType, ExportSheet } from "./columns";

// Ο δικός μας μικρός writer .xlsx (Ρ6): ένα OOXML πακέτο (zip με fflate) με ένα φύλλο ανά ExportSheet.
// Αριθμοί και ποσά ως αριθμοί, ημερομηνίες ως πραγματικές ημερομηνίες (σειριακός αριθμός του Excel με μορφή),
// κείμενα ως inline strings (χωρίς sharedStrings), ελληνικοί τίτλοι στη γραμμή 1, παγωμένη η γραμμή τίτλων.

const NS_MAIN = "http://schemas.openxmlformats.org/spreadsheetml/2006/main";
const NS_REL = "http://schemas.openxmlformats.org/officeDocument/2006/relationships";
const NS_PKG_REL = "http://schemas.openxmlformats.org/package/2006/relationships";
const XML_HEAD = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n';
const CT = "application/vnd.openxmlformats-officedocument.spreadsheetml";
const MAX_TEXT = 32767;
const MAX_SHEET_NAME = 31;

// Τα στυλ κελιών (cellXfs) με τη σειρά του styles.xml.
const STYLE = { text: 0, header: 1, integer: 2, money: 3, percent: 4, date: 5, month: 6, number: 7 } as const;

const STYLES_XML =
  `${XML_HEAD}<styleSheet xmlns="${NS_MAIN}">` +
  '<numFmts count="3"><numFmt numFmtId="164" formatCode="dd/mm/yyyy"/>' +
  '<numFmt numFmtId="165" formatCode="mm/yyyy"/><numFmt numFmtId="166" formatCode="0.0%"/></numFmts>' +
  '<fonts count="2"><font><sz val="11"/><name val="Calibri"/></font>' +
  '<font><b/><sz val="11"/><name val="Calibri"/></font></fonts>' +
  '<fills count="2"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill></fills>' +
  '<borders count="1"><border><left/><right/><top/><bottom/><diagonal/></border></borders>' +
  '<cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs>' +
  '<cellXfs count="8">' +
  '<xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/>' +
  '<xf numFmtId="0" fontId="1" fillId="0" borderId="0" xfId="0" applyFont="1"/>' +
  '<xf numFmtId="1" fontId="0" fillId="0" borderId="0" xfId="0" applyNumberFormat="1"/>' +
  '<xf numFmtId="4" fontId="0" fillId="0" borderId="0" xfId="0" applyNumberFormat="1"/>' +
  '<xf numFmtId="166" fontId="0" fillId="0" borderId="0" xfId="0" applyNumberFormat="1"/>' +
  '<xf numFmtId="164" fontId="0" fillId="0" borderId="0" xfId="0" applyNumberFormat="1"/>' +
  '<xf numFmtId="165" fontId="0" fillId="0" borderId="0" xfId="0" applyNumberFormat="1"/>' +
  '<xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/>' +
  "</cellXfs>" +
  '<cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles>' +
  "</styleSheet>";

// Χαρακτήρες που δεν επιτρέπει το XML 1.0 (εκτός από tab, LF, CR).
const INVALID_XML = /[\u0000-\u0008\u000B\u000C\u000E-\u001F￾￿]/g;

export const escapeXml = (text: string): string =>
  text
    .replace(INVALID_XML, "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");

// Στήλη από αριθμό (0 → A, 25 → Z, 26 → AA).
export const columnName = (index: number): string => {
  let name = "";
  for (let n = index + 1; n > 0; n = Math.floor((n - 1) / 26))
    name = String.fromCharCode(65 + ((n - 1) % 26)) + name;
  return name;
};

const EXCEL_EPOCH = Date.UTC(1899, 11, 30);
const DAY_MS = 86_400_000;

// 'YYYY-MM-DD' → σειριακός αριθμός ημερομηνίας του Excel (1900, με το ιστορικό «29/2/1900» ήδη μέσα στην αρχή 30/12/1899).
export const excelDate = (isoDate: string): number => {
  const [year, month, day] = isoDate.slice(0, 10).split("-").map(Number);
  return Math.round((Date.UTC(year, month - 1, day) - EXCEL_EPOCH) / DAY_MS);
};

// Το όνομα φύλλου: έως 31 χαρακτήρες, χωρίς : \ / ? * [ ], όχι κενό, μοναδικό στο βιβλίο.
export const sheetNames = (names: readonly string[]): string[] =>
  names.reduce<string[]>((used, raw) => {
    const clean = raw.replace(/[:\\/?*[\]]/g, " ").replace(/^'+|'+$/g, "").trim() || "Φύλλο";
    let name = clean.slice(0, MAX_SHEET_NAME);
    for (let n = 2; used.some((u) => u.toLowerCase() === name.toLowerCase()); n += 1) {
      const suffix = ` (${n})`;
      name = clean.slice(0, MAX_SHEET_NAME - suffix.length) + suffix;
    }
    return [...used, name];
  }, []);

const textCell = (ref: string, text: string, style: number): string =>
  `<c r="${ref}" t="inlineStr"${style ? ` s="${style}"` : ""}><is><t xml:space="preserve">${escapeXml(
    text.slice(0, MAX_TEXT),
  )}</t></is></c>`;

const numberCell = (ref: string, value: number, style: number): string =>
  `<c r="${ref}" s="${style}"><v>${value}</v></c>`;

const numericValue = (value: Cell, type: CellType): number | null => {
  if (type === "date" && typeof value === "string")
    return /^\d{4}-\d{2}-\d{2}/.test(value) ? excelDate(value) : null;
  if (type === "month" && typeof value === "string")
    return /^\d{4}-\d{2}$/.test(value) ? excelDate(`${value}-01`) : null;
  if (type === "text" || typeof value !== "number" || !Number.isFinite(value)) return null;
  return value;
};

// Ένα κελί δεδομένων. Κενό = καμία γραμμή XML. Κείμενο σε αριθμητική στήλη (π.χ. «Σύνολο») μένει κείμενο.
export const cellXml = (ref: string, value: Cell, type: CellType): string => {
  if (value === null || value === "") return "";
  const number = numericValue(value, type);
  if (number !== null) return numberCell(ref, number, STYLE[type]);
  return textCell(ref, String(value), STYLE.text);
};

const DISPLAY_WIDTH: Record<CellType, number> = {
  text: 0,
  integer: 8,
  number: 10,
  money: 14,
  percent: 9,
  date: 12,
  month: 9,
};

// Πλάτος στήλης από τον τίτλο και το μεγαλύτερο κείμενο, μέσα σε λογικά όρια.
const columnWidth = (sheet: ExportSheet, index: number): number => {
  const column = sheet.columns[index];
  const longest = sheet.rows.reduce((max, row) => {
    const value = row[index];
    return typeof value === "string" ? Math.max(max, value.length) : max;
  }, 0);
  return Math.min(60, Math.max(8, column.header.length + 2, DISPLAY_WIDTH[column.type], longest + 2));
};

const colsXml = (sheet: ExportSheet): string =>
  sheet.columns.length === 0
    ? ""
    : `<cols>${sheet.columns
        .map((_, i) => `<col min="${i + 1}" max="${i + 1}" width="${columnWidth(sheet, i)}" customWidth="1"/>`)
        .join("")}</cols>`;

const headerRow = (sheet: ExportSheet): string =>
  `<row r="1">${sheet.columns
    .map((column, i) => textCell(`${columnName(i)}1`, column.header, STYLE.header))
    .join("")}</row>`;

const dataRow = (sheet: ExportSheet, row: readonly Cell[], index: number): string => {
  const r = index + 2;
  const cells = sheet.columns.map((column, i) => cellXml(`${columnName(i)}${r}`, row[i] ?? null, column.type));
  return `<row r="${r}">${cells.join("")}</row>`;
};

export const worksheetXml = (sheet: ExportSheet): string =>
  `${XML_HEAD}<worksheet xmlns="${NS_MAIN}" xmlns:r="${NS_REL}">` +
  '<sheetViews><sheetView workbookViewId="0">' +
  '<pane ySplit="1" topLeftCell="A2" activePane="bottomLeft" state="frozen"/></sheetView></sheetViews>' +
  '<sheetFormatPr defaultRowHeight="15"/>' +
  colsXml(sheet) +
  `<sheetData>${headerRow(sheet)}${sheet.rows.map((row, i) => dataRow(sheet, row, i)).join("")}</sheetData>` +
  "</worksheet>";

const contentTypesXml = (count: number): string =>
  `${XML_HEAD}<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">` +
  `<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>` +
  `<Default Extension="xml" ContentType="application/xml"/>` +
  `<Override PartName="/xl/workbook.xml" ContentType="${CT}.sheet.main+xml"/>` +
  `<Override PartName="/xl/styles.xml" ContentType="${CT}.styles+xml"/>` +
  Array.from(
    { length: count },
    (_, i) => `<Override PartName="/xl/worksheets/sheet${i + 1}.xml" ContentType="${CT}.worksheet+xml"/>`,
  ).join("") +
  "</Types>";

const ROOT_RELS =
  `${XML_HEAD}<Relationships xmlns="${NS_PKG_REL}">` +
  `<Relationship Id="rId1" Type="${NS_REL}/officeDocument" Target="xl/workbook.xml"/></Relationships>`;

const workbookXml = (names: readonly string[]): string =>
  `${XML_HEAD}<workbook xmlns="${NS_MAIN}" xmlns:r="${NS_REL}"><sheets>` +
  names.map((name, i) => `<sheet name="${escapeXml(name)}" sheetId="${i + 1}" r:id="rId${i + 1}"/>`).join("") +
  "</sheets></workbook>";

const workbookRels = (count: number): string =>
  `${XML_HEAD}<Relationships xmlns="${NS_PKG_REL}">` +
  Array.from(
    { length: count },
    (_, i) => `<Relationship Id="rId${i + 1}" Type="${NS_REL}/worksheet" Target="worksheets/sheet${i + 1}.xml"/>`,
  ).join("") +
  `<Relationship Id="rId${count + 1}" Type="${NS_REL}/styles" Target="styles.xml"/></Relationships>`;

// Τα αρχεία του πακέτου, πριν από το zip (χρήσιμο και για τα τεστ).
export const xlsxParts = (sheets: readonly ExportSheet[]): Record<string, string> => {
  const list = sheets.length > 0 ? sheets : [{ name: "Φύλλο", columns: [], rows: [] }];
  const names = sheetNames(list.map((sheet) => sheet.name));
  return {
    "[Content_Types].xml": contentTypesXml(list.length),
    "_rels/.rels": ROOT_RELS,
    "xl/workbook.xml": workbookXml(names),
    "xl/_rels/workbook.xml.rels": workbookRels(list.length),
    "xl/styles.xml": STYLES_XML,
    ...Object.fromEntries(list.map((sheet, i) => [`xl/worksheets/sheet${i + 1}.xml`, worksheetXml(sheet)])),
  };
};

export const XLSX_MIME = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";

export const buildXlsx = (sheets: readonly ExportSheet[]): Uint8Array => {
  const files: Zippable = Object.fromEntries(
    Object.entries(xlsxParts(sheets)).map(([path, xml]) => [path, strToU8(xml)]),
  );
  return zipSync(files, { level: 6 });
};
