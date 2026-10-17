import type { Cell, CellType, ExportSheet } from "./sheet";

// CSV για το ελληνικό Excel (Ρ6): UTF-8 με BOM, «;» ως διαχωριστικό, γραμμές με CRLF.
// Σύμβαση αριθμών: δεκαδική υποδιαστολή «,», χωρίς διαχωριστικό χιλιάδων (1234,50), ώστε το ελληνικό Excel να τους
// διαβάζει ως αριθμούς· ποσά με 2 δεκαδικά· ποσοστά ως «25,3%»· ημερομηνίες «dd/mm/yyyy», μήνες «mm/yyyy».
// Κείμενο που αρχίζει με = + - @ tab ή CR παίρνει μπροστά «'» (όχι τύποι στο Excel)· κείμενο με « ; , " » ή αλλαγή
// γραμμής μπαίνει σε εισαγωγικά, με διπλά τα εσωτερικά εισαγωγικά. Ίδιος κανόνας με τα CSV των Οικονομικών.

export const CSV_SEPARATOR = ";";
export const CSV_BOM = "﻿";
export const CSV_MIME = "text/csv;charset=utf-8";

export const csvText = (value: string): string => {
  const guarded = /^[=+\-@\t\r]/.test(value) ? `'${value}` : value;
  return /[",;\r\n]/.test(guarded)
    ? `"${guarded.replace(/"/g, '""')}"`
    : guarded;
};

const decimal = (value: number, digits?: number): string => {
  const text =
    digits === undefined
      ? String(Number(value.toPrecision(15)))
      : value.toFixed(digits);
  return text.replace(".", ",");
};

const dayMonthYear = (isoDate: string): string => {
  const [year, month, day] = isoDate.slice(0, 10).split("-");
  return `${day}/${month}/${year}`;
};

const monthYear = (month: string): string => {
  const [year, number] = month.split("-");
  return `${number}/${year}`;
};

const numberText = (value: number, type: CellType): string => {
  if (type === "money") return decimal(value, 2);
  if (type === "integer") return String(Math.round(value));
  if (type === "percent") return `${decimal(Math.round(value * 10000) / 100)}%`;
  return decimal(value);
};

// Ένα κελί CSV. Κενό = τίποτα ανάμεσα στα «;».
export const csvCell = (value: Cell, type: CellType): string => {
  if (value === null) return "";
  if (typeof value === "number")
    return type === "text" ? csvText(String(value)) : numberText(value, type);
  if (type === "date" && /^\d{4}-\d{2}-\d{2}/.test(value)) return dayMonthYear(value);
  if (type === "month" && /^\d{4}-\d{2}$/.test(value)) return monthYear(value);
  return csvText(value);
};

export const toCsv = (sheet: ExportSheet): string => {
  const header = sheet.columns.map((column) => csvText(column.header));
  const rows = sheet.rows.map((row) =>
    sheet.columns.map((column, i) => csvCell(row[i] ?? null, column.type)),
  );
  return (
    CSV_BOM +
    [header, ...rows].map((cells) => cells.join(CSV_SEPARATOR)).join("\r\n")
  );
};

export const buildCsv = (sheet: ExportSheet): Uint8Array =>
  new TextEncoder().encode(toCsv(sheet));
