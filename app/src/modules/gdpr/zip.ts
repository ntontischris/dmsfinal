import { strToU8, zipSync, type Zippable } from "fflate";

import { buildCsv } from "@/lib/export/csv";
import { fileBase, uniqueName } from "@/lib/export/file-name";
import { mapLimit } from "@/lib/export/map-limit";
import type { Cell, CellType, ExportSheet } from "@/lib/export/sheet";

import {
  COLUMN_TITLES,
  MONEY_COLUMNS,
  PDF_MISSING,
  SECTION_TITLES,
  SUBJECT_KIND_LABEL,
  ZIP_FOLDER,
  ZIP_JSON,
  ZIP_PDF_FOLDER,
  ZIP_README,
} from "./labels";
import type { ExportRow, GdprExportData } from "./schemas";

// Η εξαγωγή GDPR στον browser (Ν7), με τα κομμάτια του Πακέτου λογιστή: κατεβάζει τα PDF των Τιμολογίων από τα signed
// URLs, γράφει ένα JSON με όλα, ένα CSV ανά ενότητα και ένα ΔΙΑΒΑΣΕ.txt, και τα κλείνει σε ένα .zip. Τιμολόγιο χωρίς PDF
// γράφεται ρητά (στο ΔΙΑΒΑΣΕ, στο JSON και στο CSV), δεν παραλείπεται.

// Ένα Τιμολόγιο της εξαγωγής, με τη σειρά της ενότητας «invoices».
export interface GdprPdf {
  number: string;
  url: string | null;
  // Γιατί δεν υπάρχει URL· null όταν υπάρχει.
  missing: string | null;
}

export interface GdprPayload {
  data: GdprExportData;
  // Η μέρα της εξαγωγής (YYYY-MM-DD), για το όνομα του φακέλου.
  exportedOn: string;
  pdfs: readonly GdprPdf[];
}

export type PdfFetcher = (url: string) => Promise<Uint8Array | null>;

export interface GdprZip {
  bytes: Uint8Array;
  fileName: string;
  pdfCount: number;
  missing: readonly { number: string; reason: string }[];
}

interface ResolvedPdf {
  number: string;
  name: string | null;
  bytes: Uint8Array | null;
  reason: string | null;
}

const safeFetch = async (
  fetchPdf: PdfFetcher,
  url: string,
): Promise<Uint8Array | null> => {
  try {
    return await fetchPdf(url);
  } catch {
    return null;
  }
};

// Ονόματα PDF μοναδικά μέσα στο zip: «<αριθμός>.pdf», «<αριθμός> (2).pdf».
export const resolvePdfs = (
  pdfs: readonly GdprPdf[],
  downloads: readonly (Uint8Array | null)[],
): ResolvedPdf[] =>
  pdfs.reduce<{ used: ReadonlySet<string>; out: ResolvedPdf[] }>(
    (acc, pdf, index) => {
      const bytes = downloads[index] ?? null;
      if (!bytes) {
        const reason = pdf.missing ?? PDF_MISSING.failed;
        return {
          used: acc.used,
          out: [
            ...acc.out,
            { number: pdf.number, name: null, bytes: null, reason },
          ],
        };
      }
      const name = uniqueName(fileBase([pdf.number]), "pdf", acc.used);
      return {
        used: new Set([...acc.used, name]),
        out: [...acc.out, { number: pdf.number, name, bytes, reason: null }],
      };
    },
    { used: new Set<string>(), out: [] },
  ).out;

const pdfCell = (pdf: ResolvedPdf | undefined): string | null =>
  !pdf
    ? null
    : pdf.name
      ? `${ZIP_PDF_FOLDER}/${pdf.name}`
      : `Χωρίς PDF: ${pdf.reason}`;

// Τα Τιμολόγια χωρίς τα εσωτερικά τους (id, διαδρομή αποθήκευσης), με το αρχείο PDF μέσα στο zip ή γιατί λείπει.
const INTERNAL_INVOICE_KEYS: ReadonlySet<string> = new Set(["id", "pdfPath"]);

const withPdfFiles = (rows: readonly ExportRow[], resolved: readonly ResolvedPdf[]): ExportRow[] =>
  rows.map((row, index) => ({
    ...Object.fromEntries(Object.entries(row).filter(([key]) => !INTERNAL_INVOICE_KEYS.has(key))),
    pdfFile: pdfCell(resolved[index]),
  }));

export const sectionTitle = (key: string): string => SECTION_TITLES[key] ?? key;

const isDay = (value: string): boolean => /^\d{4}-\d{2}-\d{2}$/.test(value);

const columnType = (key: string, rows: readonly ExportRow[]): CellType => {
  const sample = rows
    .map((row) => row[key])
    .find((value) => value !== null && value !== undefined);
  if (typeof sample === "number")
    return MONEY_COLUMNS.has(key) ? "money" : "number";
  if (typeof sample === "string" && isDay(sample)) return "date";
  return "text";
};

const toCell = (value: ExportRow[string] | undefined): Cell => {
  if (value === null || value === undefined) return null;
  if (typeof value === "boolean") return value ? "Ναι" : "Όχι";
  return value;
};

// Ένα φύλλο CSV από τις γραμμές μιας ενότητας: στήλες με τη σειρά που πρωτοεμφανίζονται.
export const sectionSheet = (
  key: string,
  rows: readonly ExportRow[],
): ExportSheet => {
  const keys = [...new Set(rows.flatMap((row) => Object.keys(row)))];
  return {
    name: sectionTitle(key),
    columns: keys.map((column) => ({
      header: COLUMN_TITLES[column] ?? column,
      type: columnType(column, rows),
    })),
    rows: rows.map((row) => keys.map((column) => toCell(row[column]))),
  };
};

const sectionCount = (value: GdprExportData["sections"][string]): number =>
  Array.isArray(value) ? value.length : value ? 1 : 0;

export const gdprReadme = (
  data: GdprExportData,
  resolved: readonly ResolvedPdf[],
): string => {
  const missing = resolved.filter((pdf) => !pdf.name);
  const lines = [
    `Εξαγωγή δεδομένων GDPR · ${SUBJECT_KIND_LABEL[data.subject.kind]}: ${data.subject.label}`,
    "",
    `Δεδομένα σε μορφή μηχανής: ${ZIP_JSON}. Ένα CSV ανά ενότητα για ανάγνωση σε Excel.`,
    "Τα Εσωτερικά Μηνύματα της ομάδας δεν περιλαμβάνονται.",
    "",
    "Ενότητες:",
    ...Object.entries(data.sections).map(
      ([key, value]) => `- ${sectionTitle(key)}: ${sectionCount(value)}`,
    ),
    "",
    ...(resolved.length === 0
      ? []
      : missing.length === 0
        ? [
            `Όλα τα Τιμολόγια έχουν το PDF τους στον φάκελο «${ZIP_PDF_FOLDER}».`,
          ]
        : [
            `Τιμολόγια ΧΩΡΙΣ PDF σε αυτό το αρχείο (${missing.length}):`,
            ...missing.map((pdf) => `- ${pdf.number} · ${pdf.reason}`),
          ]),
  ];
  return `${lines.join("\r\n")}\r\n`;
};

export const gdprFolder = (
  payload: Pick<GdprPayload, "data" | "exportedOn">,
): string =>
  fileBase([ZIP_FOLDER, payload.data.subject.label, payload.exportedOn]);

const csvFiles = (
  folder: string,
  sections: GdprExportData["sections"],
): Zippable =>
  Object.fromEntries(
    Object.entries(sections).flatMap(([key, value]) =>
      Array.isArray(value) && value.length > 0
        ? [
            [
              `${folder}/${fileBase([sectionTitle(key)])}.csv`,
              buildCsv(sectionSheet(key, value)),
            ],
          ]
        : [],
    ),
  );

export async function buildGdprZip(
  payload: GdprPayload,
  fetchPdf: PdfFetcher,
  concurrency = 4,
): Promise<GdprZip> {
  const downloads = await mapLimit(payload.pdfs, concurrency, (pdf) =>
    pdf.url ? safeFetch(fetchPdf, pdf.url) : Promise.resolve(null),
  );
  const resolved = resolvePdfs(payload.pdfs, downloads);
  const invoices = payload.data.sections.invoices;
  const sections = Array.isArray(invoices)
    ? { ...payload.data.sections, invoices: withPdfFiles(invoices, resolved) }
    : payload.data.sections;
  const data = { ...payload.data, sections };
  const folder = gdprFolder(payload);
  const files: Zippable = {
    [`${folder}/${ZIP_README}`]: strToU8(gdprReadme(data, resolved)),
    [`${folder}/${ZIP_JSON}`]: strToU8(JSON.stringify(data, null, 2)),
    ...csvFiles(folder, sections),
    ...Object.fromEntries(
      resolved.flatMap((pdf) =>
        pdf.name && pdf.bytes
          ? [
              [
                `${folder}/${ZIP_PDF_FOLDER}/${pdf.name}`,
                [pdf.bytes, { level: 0 }],
              ],
            ]
          : [],
      ),
    ),
  };
  const missing = resolved.flatMap((pdf) =>
    pdf.name ? [] : [{ number: pdf.number, reason: pdf.reason ?? "" }],
  );
  return {
    bytes: zipSync(files, { level: 6 }),
    fileName: `${folder}.zip`,
    pdfCount: resolved.length - missing.length,
    missing,
  };
}
