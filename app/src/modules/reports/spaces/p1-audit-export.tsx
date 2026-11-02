"use client";

import { saveBytes } from "@/lib/export/save";

import { exportAuditTrail } from "../export/actions";
import { exportFile } from "../export/download";
import { AUDIT_EXPORT_LABEL, AUDIT_EXPORT_NOTE, FORMATS } from "../export/labels";
import type { ExportFormat } from "../export/report-export";
import { FileButton } from "./file-button";

const FORMAT_ORDER: readonly ExportFormat[] = ["xlsx", "csv"];

// «Εξαγωγή» του Ίχνους ενεργειών (P1) στη νέα εμφάνιση (prototype `screens/P1.tsx`), με τα φίλτρα της διεύθυνσης.
// Ίδια ενέργεια με το AuditExportButtons: Excel ή CSV, κατεβαίνει αμέσως, γράφεται στο Ίχνος.
export function SpacesAuditExport({ filters }: { filters: Readonly<Record<string, string>> }) {
  const taskOf = (format: ExportFormat) => async () => {
    const outcome = await exportAuditTrail({ filters: { ...filters }, format });
    if (!outcome.ok) return { error: outcome.error };
    const file = exportFile(outcome.sheets, format);
    saveBytes(file.bytes, outcome.fileName, file.mime);
    return { notice: outcome.notice ?? `Κατέβηκε το αρχείο ${FORMATS[format].label}.` };
  };
  return (
    <>
      <div className="btn-row">
        <span className="muted">{AUDIT_EXPORT_LABEL}</span>
        {FORMAT_ORDER.map((format) => (
          <FileButton key={format} label={FORMATS[format].label} task={taskOf(format)} />
        ))}
      </div>
      <p className="note">{AUDIT_EXPORT_NOTE}</p>
    </>
  );
}
