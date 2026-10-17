import { buildCsv, CSV_MIME } from "@/lib/export/csv";

import type { ExportSheet } from "./columns";
import type { ExportFormat } from "./report-export";
import { buildXlsx, XLSX_MIME } from "./xlsx";

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
