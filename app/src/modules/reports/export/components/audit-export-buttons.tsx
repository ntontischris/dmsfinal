"use client";

import { Button } from "@/components/ui/button";
import { FormMessage } from "@/components/ui/form-message";
import { saveBytes } from "@/lib/export/save";

import { exportAuditTrail } from "../actions";
import { exportFile } from "../download";
import { AUDIT_EXPORT_LABEL, AUDIT_EXPORT_NOTE, EXPORTING, FORMATS } from "../labels";
import type { ExportFormat } from "../report-export";
import { useFileTask } from "./use-file-task";

interface AuditExportButtonsProps {
  // Τα φίλτρα του P1 όπως τα δέχεται η βάση (who, area, entity, id, action, period).
  filters: Readonly<Record<string, string>>;
}

const FORMAT_ORDER: readonly ExportFormat[] = ["xlsx", "csv"];

// «Εξαγωγή» του Ίχνους ενεργειών (Υ5) με τα φίλτρα της διεύθυνσης. Excel ή CSV, κατεβαίνει αμέσως.
export function AuditExportButtons({ filters }: AuditExportButtonsProps) {
  const { isPending, state, run } = useFileTask();
  const handleExport = (format: ExportFormat) =>
    run(async () => {
      const outcome = await exportAuditTrail({ filters: { ...filters }, format });
      if (!outcome.ok) return { error: outcome.error };
      const file = exportFile(outcome.sheets, format);
      saveBytes(file.bytes, outcome.fileName, file.mime);
      return outcome.notice ? { notice: outcome.notice } : {};
    });
  return (
    <div className="grid gap-2">
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-sm text-muted-foreground">{isPending ? EXPORTING : AUDIT_EXPORT_LABEL}</span>
        {FORMAT_ORDER.map((format) => (
          <Button key={format} size="sm" onClick={() => handleExport(format)} disabled={isPending}>
            {FORMATS[format].label}
          </Button>
        ))}
      </div>
      <p className="m-0 text-sm text-muted-foreground">{AUDIT_EXPORT_NOTE}</p>
      <FormMessage state={state} />
    </div>
  );
}
