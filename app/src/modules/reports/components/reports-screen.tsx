import Link from "next/link";
import { Suspense } from "react";

import { ScreenHeader } from "@/components/shell/screen-header";
import { Notice } from "@/components/ui/notice";
import { AccessNotice, can, type Viewer } from "@/modules/access";

import {
  REPORT_ACTIONS,
  findReport,
  visibleReports,
  type ReportDefinition,
  type ReportFilters,
} from "../catalog";
import {
  BASIS_LABEL,
  NONE_VISIBLE_TEXT,
  NONE_VISIBLE_TITLE,
  NO_ACCESS_TEXT,
  PROFITABILITY_LINK,
  PROFITABILITY_NOTE,
  REPORTS_BACK,
  REPORTS_EYEBROW,
  REPORTS_TITLE,
  REPORT_NO_ACCESS_TEXT,
  UNKNOWN_REPORT_TEXT,
  UNKNOWN_REPORT_TITLE,
} from "../labels";
import { REPORTS_PATH } from "../url";
import { PeriodFilter } from "./period-filter";
import { ReportCatalogue } from "./report-catalogue";
import { ReportSkeleton } from "./report-skeleton";

const PROFITABILITY_PATH = "/app/productions/costs";

export interface ReportsScreenProps {
  viewer: Viewer;
  reportId?: string;
  filters: ReportFilters;
}

function Catalogue({ viewer }: { viewer: Viewer }) {
  const reports = visibleReports(viewer);
  return (
    <div className="grid gap-4">
      {reports.length === 0 ? (
        <Notice kind="empty" title={NONE_VISIBLE_TITLE}>
          <p className="m-0">{NONE_VISIBLE_TEXT}</p>
        </Notice>
      ) : (
        <ReportCatalogue reports={reports} />
      )}
      {can(viewer, "finance.cost") && (
        <p className="m-0 text-sm text-muted-foreground">
          {PROFITABILITY_NOTE}{" "}
          <Link href={PROFITABILITY_PATH}>{PROFITABILITY_LINK}</Link>
        </p>
      )}
    </div>
  );
}

function ReportView({
  viewer,
  report,
  filters,
}: {
  viewer: Viewer;
  report: ReportDefinition;
  filters: ReportFilters;
}) {
  const Body = report.Body;
  const actions = REPORT_ACTIONS.map((Action, index) => (
    <Action key={index} report={report} filters={filters} viewer={viewer} />
  ));
  return (
    <div className="grid min-w-0 gap-4">
      <p className="m-0">
        <Link href={REPORTS_PATH}>{REPORTS_BACK}</Link>
      </p>
      <div className="grid gap-1">
        <h2 className="m-0 text-xl font-medium">{report.title}</h2>
        <p className="m-0 text-sm text-muted-foreground">{report.answers}</p>
      </div>
      {report.usesPeriod && (
        <Suspense fallback={null}>
          <PeriodFilter
            reportId={report.id}
            period={filters.period}
            clientId={filters.clientId}
            sellerId={filters.sellerId}
          />
        </Suspense>
      )}
      <Suspense
        key={`${report.id}-${filters.period}-${filters.clientId ?? ""}-${filters.sellerId ?? ""}`}
        fallback={<ReportSkeleton title={report.title} />}
      >
        <Body
          report={report}
          filters={filters}
          viewer={viewer}
          actions={actions.length > 0 ? actions : null}
        />
      </Suspense>
      <details className="text-sm text-muted-foreground">
        <summary className="cursor-pointer">{BASIS_LABEL}</summary>
        <p className="m-0 mt-2">{report.basis}</p>
      </details>
    </div>
  );
}

function Content({ viewer, reportId, filters }: ReportsScreenProps) {
  if (!can(viewer, "reports.view")) {
    return (
      <AccessNotice viewer={viewer}>
        <p className="m-0">{NO_ACCESS_TEXT}</p>
      </AccessNotice>
    );
  }
  if (!reportId) return <Catalogue viewer={viewer} />;
  const report = findReport(reportId);
  if (!report) {
    return (
      <Notice kind="empty" title={UNKNOWN_REPORT_TITLE}>
        <p className="m-0">{UNKNOWN_REPORT_TEXT}</p>
        <Link href={REPORTS_PATH}>{REPORTS_BACK}</Link>
      </Notice>
    );
  }
  if (!report.isVisible(viewer)) {
    return (
      <AccessNotice viewer={viewer}>
        <p className="m-0">{REPORT_NO_ACCESS_TEXT}</p>
      </AccessNotice>
    );
  }
  return <ReportView viewer={viewer} report={report} filters={filters} />;
}

// M1 «Αναφορές»: κατάλογος ή μία Αναφορά (?report=), με τα φίλτρα της διεύθυνσης. Οι Αναφορές έρχονται από το μητρώο
// (catalog/), άρα νέα Αναφορά ή νέα ενέργεια δεν αλλάζει αυτό το αρχείο.
export function ReportsScreen(props: ReportsScreenProps) {
  return (
    <>
      <ScreenHeader eyebrow={REPORTS_EYEBROW} title={REPORTS_TITLE} />
      <Content {...props} />
    </>
  );
}
