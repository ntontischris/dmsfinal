"use client";

import { Button } from "@/components/ui/button";
import { FormMessage } from "@/components/ui/form-message";

import type { PeriodCode } from "@/modules/reports/url";
import { exportDataset } from "../actions";
import type { DatasetCode } from "../datasets";
import { exportFile, saveBytes } from "../download";
import { EXPORT_BUTTON, EXPORTING } from "../labels";
import type { ExportFormat } from "../report-export";
import { useFileTask } from "./use-file-task";

interface DatasetDownloadProps {
  dataset: DatasetCode;
  period?: PeriodCode;
  format: ExportFormat;
}

// «Εξαγωγή» ενός συνόλου: η βάση γράφει Ίχνος και δίνει τις γραμμές, το αρχείο φτιάχνεται εδώ και κατεβαίνει αμέσως.
export function DatasetDownload({
  dataset,
  period,
  format,
}: DatasetDownloadProps) {
  const { isPending, state, run } = useFileTask();
  const handleClick = () =>
    run(async () => {
      const outcome = await exportDataset({ dataset, period, format });
      if (!outcome.ok) return { error: outcome.error };
      const file = exportFile(outcome.sheets, format);
      saveBytes(file.bytes, outcome.fileName, file.mime);
      return {};
    });
  return (
    <div className="grid gap-2">
      <div>
        <Button variant="primary" onClick={handleClick} disabled={isPending}>
          {isPending ? EXPORTING : EXPORT_BUTTON}
        </Button>
      </div>
      <FormMessage state={state} />
    </div>
  );
}
