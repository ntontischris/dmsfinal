"use client";

import { Button } from "@/components/ui/button";
import { FormMessage } from "@/components/ui/form-message";

import type { PeriodCode } from "@/modules/reports/url";
import { exportReport } from "../actions";
import { saveBytes } from "@/lib/export/save";

import { exportFile } from "../download";
import { EXPORTING, FORMATS, REPORT_EXPORT_LABEL } from "../labels";
import type { ExportFormat } from "../report-export";
import { useFileTask } from "./use-file-task";

interface ReportExportButtonsProps {
  reportId: string;
  period: PeriodCode;
  clientId?: string;
  sellerId?: string;
}

const FORMAT_ORDER: readonly ExportFormat[] = ["xlsx", "csv"];

// «Εξαγωγή» κάτω από κάθε Αναφορά της M1, με τα ίδια φίλτρα της διεύθυνσης. Excel ή CSV, κατεβαίνει αμέσως.
export function ReportExportButtons({
  reportId,
  period,
  clientId,
  sellerId,
}: ReportExportButtonsProps) {
  const { isPending, state, run } = useFileTask();
  const handleExport = (format: ExportFormat) =>
    run(async () => {
      const outcome = await exportReport({
        reportId,
        period,
        clientId,
        sellerId,
        format,
      });
      if (!outcome.ok) return { error: outcome.error };
      const file = exportFile(outcome.sheets, format);
      saveBytes(file.bytes, outcome.fileName, file.mime);
      return {};
    });
  return (
    <div className="grid gap-2">
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-sm text-muted-foreground">
          {isPending ? EXPORTING : REPORT_EXPORT_LABEL}
        </span>
        {FORMAT_ORDER.map((format) => (
          <Button
            key={format}
            size="sm"
            onClick={() => handleExport(format)}
            disabled={isPending}
          >
            {FORMATS[format].label}
          </Button>
        ))}
      </div>
      <FormMessage state={state} />
    </div>
  );
}
