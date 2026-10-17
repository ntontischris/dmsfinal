import Link from "next/link";
import { Suspense } from "react";

import { ScreenHeader } from "@/components/shell/screen-header";
import { Notice } from "@/components/ui/notice";
import { AccessNotice, can, type Viewer } from "@/modules/access";

import { ReportSkeleton } from "@/modules/reports/components/report-skeleton";
import { RetryButton } from "@/modules/reports/components/retry-button";
import { REPORTS_PATH, type PeriodCode } from "@/modules/reports/url";
import { DATASETS, type DatasetCode } from "../datasets";
import {
  EXPORT_EYEBROW,
  EXPORT_LOAD_ERROR_TEXT,
  EXPORT_LOAD_ERROR_TITLE,
  EXPORT_NO_ACCESS,
  EXPORT_TITLE,
  NO_DATASETS_TEXT,
  NO_DATASETS_TITLE,
  REPORTS_LINK,
  REPORTS_LINK_NOTE,
} from "../labels";
import { getExportOverview } from "../queries";
import type { ExportFormat } from "../report-export";
import type { ExportQuery } from "../url";
import { DatasetSection } from "./dataset-section";
import { HistorySection } from "./history-section";
import { PackSection } from "./pack-section";

export interface ExportScreenProps {
  viewer: Viewer;
  dataset?: DatasetCode;
  period: PeriodCode;
  format: ExportFormat;
  month?: string;
}

// Πακέτο λογιστή και σύνολα: ό,τι δείχνει η βάση για αυτόν τον Χρήστη (ποια σύνολα, πόσες γραμμές).
async function ExportBody({
  dataset,
  period,
  format,
  month,
}: Omit<ExportScreenProps, "viewer">) {
  const result = await getExportOverview(period);
  if (!result.ok) {
    return (
      <Notice kind="error" title={EXPORT_LOAD_ERROR_TITLE}>
        <p className="m-0">{EXPORT_LOAD_ERROR_TEXT}</p>
        <RetryButton />
      </Notice>
    );
  }
  const overview = result.data;
  const visible = DATASETS.filter((d) =>
    overview.items.some((item) => item.code === d.code),
  );
  const chosen = visible.find((d) => d.code === dataset) ?? visible[0];
  const keep: ExportQuery = { dataset: chosen?.code, period, format };
  const seesFinance = overview.items.some((item) => item.code === "invoices");
  return (
    <div className="grid min-w-0 gap-4">
      {seesFinance && (
        <PackSection today={overview.today} month={month} keep={keep} />
      )}
      {chosen ? (
        <DatasetSection
          overview={overview}
          dataset={chosen}
          period={period}
          format={format}
          month={month}
        />
      ) : (
        <Notice kind="empty" title={NO_DATASETS_TITLE}>
          <p className="m-0">{NO_DATASETS_TEXT}</p>
        </Notice>
      )}
    </div>
  );
}

// M2 «Εξαγωγή δεδομένων» (Ργ #200, Ρδ #201): Πακέτο λογιστή, εξαγωγή συνόλου, Ιστορικό εξαγωγών. Θέλει «Εξάγει δεδομένα».
export function ExportScreen({ viewer, ...props }: ExportScreenProps) {
  return (
    <>
      <ScreenHeader eyebrow={EXPORT_EYEBROW} title={EXPORT_TITLE} />
      {can(viewer, "reports.export") ? (
        <div className="grid min-w-0 gap-4">
          <Suspense
            key={`${props.dataset ?? ""}-${props.period}-${props.format}-${props.month ?? ""}`}
            fallback={<ReportSkeleton title={EXPORT_TITLE} />}
          >
            <ExportBody {...props} />
          </Suspense>
          <Suspense fallback={null}>
            <HistorySection />
          </Suspense>
          <p className="m-0 text-sm text-muted-foreground">
            {REPORTS_LINK_NOTE} <Link href={REPORTS_PATH}>{REPORTS_LINK}</Link>.
          </p>
        </div>
      ) : (
        <AccessNotice viewer={viewer}>
          <p className="m-0">{EXPORT_NO_ACCESS}</p>
        </AccessNotice>
      )}
    </>
  );
}
