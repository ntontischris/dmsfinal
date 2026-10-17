import { strToU8, zipSync, type Zippable } from "fflate";

import { fileBase, uniqueName } from "@/lib/export/file-name";
import { mapLimit } from "@/lib/export/map-limit";

import type { Cell, ExportSheet } from "./columns";
import {
  PACK_FOLDER,
  PACK_PDF_COLUMN,
  PACK_PDF_FOLDER,
  PACK_README,
  PACK_WORKBOOK,
  PDF_MISSING,
} from "./labels";
import { buildXlsx } from "./xlsx";

// Το Πακέτο λογιστή στον browser (Ρ8): κατεβάζει τα PDF από τα signed URLs, γράφει το Excel δύο φύλλων με τη στήλη
// «Αρχείο PDF» και ένα ΔΙΑΒΑΣΕ.txt, και τα κλείνει σε ένα .zip. Τιμολόγιο χωρίς PDF γράφεται ρητά, δεν παραλείπεται.

// Ένα Τιμολόγιο του πακέτου, με τη σειρά των γραμμών του φύλλου Τιμολογίων.
export interface PackFile {
  number: string;
  clientName: string;
  url: string | null;
  // Γιατί δεν υπάρχει URL (π.χ. χωρίς «Βλέπει ποσά»)· null όταν υπάρχει.
  missing: string | null;
}

export interface PackPayload {
  month: string;
  monthLabel: string;
  isPartial: boolean;
  invoices: ExportSheet;
  files: readonly PackFile[];
  receipts: ExportSheet;
}

export type PdfFetcher = (url: string) => Promise<Uint8Array | null>;

export interface PackResult {
  bytes: Uint8Array;
  fileName: string;
  pdfCount: number;
  missing: readonly { number: string; clientName: string; reason: string }[];
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

interface Resolved {
  file: PackFile;
  name: string | null;
  bytes: Uint8Array | null;
  reason: string | null;
}

// Ονόματα PDF μοναδικά μέσα στο zip: «<αριθμός> <Πελάτης>.pdf».
export const resolvePdfs = (
  files: readonly PackFile[],
  downloads: readonly (Uint8Array | null)[],
): Resolved[] =>
  files.reduce<{ used: Set<string>; out: Resolved[] }>(
    (acc, file, index) => {
      const bytes = downloads[index] ?? null;
      if (!bytes) {
        const reason = file.missing ?? PDF_MISSING.failed;
        return {
          used: acc.used,
          out: [...acc.out, { file, name: null, bytes: null, reason }],
        };
      }
      const name = uniqueName(
        fileBase([file.number, file.clientName]),
        "pdf",
        acc.used,
      );
      return {
        used: new Set([...acc.used, name]),
        out: [...acc.out, { file, name, bytes, reason: null }],
      };
    },
    { used: new Set<string>(), out: [] },
  ).out;

// Το φύλλο Τιμολογίων με τη στήλη «Αρχείο PDF» (το όνομα μέσα στο zip, ή γιατί λείπει).
export const withPdfColumn = (
  sheet: ExportSheet,
  resolved: readonly Resolved[],
): ExportSheet => ({
  ...sheet,
  columns: [...sheet.columns, { header: PACK_PDF_COLUMN, type: "text" }],
  rows: sheet.rows.map((row, index): Cell[] => {
    const item = resolved[index];
    const cell = !item
      ? null
      : item.name
        ? `${PACK_PDF_FOLDER}/${item.name}`
        : `Χωρίς PDF: ${item.reason}`;
    return [...row, cell];
  }),
});

export const packReadme = (
  payload: PackPayload,
  resolved: readonly Resolved[],
): string => {
  const missing = resolved.filter((item) => !item.name);
  const lines = [
    `Πακέτο λογιστή · ${payload.monthLabel}${payload.isPartial ? " (ως σήμερα)" : ""}`,
    "",
    `Τιμολόγια: ${payload.invoices.rows.length} · PDF μέσα στο πακέτο: ${resolved.length - missing.length}`,
    `Εισπράξεις: ${payload.receipts.rows.length}`,
    "",
    missing.length === 0
      ? "Όλα τα Τιμολόγια έχουν το PDF τους στον φάκελο PDF."
      : `Τιμολόγια ΧΩΡΙΣ PDF σε αυτό το πακέτο (${missing.length}):`,
    ...missing.map(
      (item) =>
        `- ${item.file.number} · ${item.file.clientName} · ${item.reason}`,
    ),
  ];
  return `${lines.join("\r\n")}\r\n`;
};

export const packFileName = (month: string): string =>
  `${fileBase([PACK_FOLDER, month])}.zip`;

export async function buildAccountantPack(
  payload: PackPayload,
  fetchPdf: PdfFetcher,
  concurrency = 4,
): Promise<PackResult> {
  const downloads = await mapLimit(payload.files, concurrency, (file) =>
    file.url ? safeFetch(fetchPdf, file.url) : Promise.resolve(null),
  );
  const resolved = resolvePdfs(payload.files, downloads);
  const folder = fileBase([PACK_FOLDER, payload.month]);
  const workbook = buildXlsx([
    withPdfColumn(payload.invoices, resolved),
    payload.receipts,
  ]);
  const files: Zippable = {
    [`${folder}/${fileBase([PACK_WORKBOOK, payload.month])}.xlsx`]: [
      workbook,
      { level: 0 },
    ],
    [`${folder}/${PACK_README}`]: strToU8(packReadme(payload, resolved)),
    ...Object.fromEntries(
      resolved.flatMap((item) =>
        item.name && item.bytes
          ? [
              [
                `${folder}/${PACK_PDF_FOLDER}/${item.name}`,
                [item.bytes, { level: 0 }],
              ],
            ]
          : [],
      ),
    ),
  };
  const missing = resolved
    .filter((item) => !item.name)
    .map((item) => ({
      number: item.file.number,
      clientName: item.file.clientName,
      reason: item.reason ?? "",
    }));
  return {
    bytes: zipSync(files, { level: 6 }),
    fileName: packFileName(payload.month),
    pdfCount: resolved.length - missing.length,
    missing,
  };
}

