import type { ExportSheet } from "./columns";
import { buildCsv, CSV_MIME } from "./csv";
import type { ExportFormat } from "./report-export";
import { buildXlsx, XLSX_MIME } from "./xlsx";

// Μόνο στον browser: το αρχείο φτιάχνεται εδώ και κατεβαίνει αμέσως (Ρ6), χωρίς να ξαναπεράσει από τον server.

export const ZIP_MIME = "application/zip";

// Ένα αρχείο από τα φύλλα: .xlsx με όλα τα φύλλα, .csv με το πρώτο (οι εξαγωγές της M1/M2 έχουν ένα φύλλο).
export const exportFile = (
  sheets: readonly ExportSheet[],
  format: ExportFormat,
): { bytes: Uint8Array; mime: string } =>
  format === "xlsx"
    ? { bytes: buildXlsx(sheets), mime: XLSX_MIME }
    : {
        bytes: buildCsv(sheets[0] ?? { name: "", columns: [], rows: [] }),
        mime: CSV_MIME,
      };

export function saveBytes(bytes: Uint8Array, name: string, mime: string): void {
  const copy = new Uint8Array(bytes);
  const url = URL.createObjectURL(new Blob([copy.buffer], { type: mime }));
  const link = document.createElement("a");
  link.href = url;
  link.download = name;
  document.body.append(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
