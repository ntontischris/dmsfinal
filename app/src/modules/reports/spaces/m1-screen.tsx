import Link from "next/link";
import { Suspense } from "react";

import { can, type Viewer } from "@/modules/access";
import { hrefOf } from "@/spaces/data/screens";
import { Panel } from "@/spaces/kit/panel";
import { ListRow, RowList } from "@/spaces/kit/parts";
import { StateNotice } from "@/spaces/screens/shared";

import {
  findReport,
  visibleReports,
  type ReportDefinition,
  type ReportFamily,
  type ReportFilters,
} from "../catalog";
import {
  NONE_VISIBLE_TEXT,
  NONE_VISIBLE_TITLE,
  NO_ACCESS_TEXT,
  REPORT_NO_ACCESS_TEXT,
  UNKNOWN_REPORT_TEXT,
  UNKNOWN_REPORT_TITLE,
} from "../labels";
import { REPORTS_PATH, reportHref } from "../url";
import { FinanceReport } from "./m1-finance";
import type { ReportBodyProps } from "./m1-model";
import { SalesReport } from "./m1-sales";

import "./m1.css";

const FAMILIES: readonly ReportFamily[] = ["finance", "sales"];
const FAMILY_LABELS: Readonly<Record<ReportFamily, string>> = {
  finance: "Οικονομικές",
  sales: "Πωλήσεις",
};

function Catalogue({ viewer }: { viewer: Viewer }) {
  const reports = visibleReports(viewer);
  return (
    <>
      {reports.length === 0 && (
        <StateNotice kind="empty" title={NONE_VISIBLE_TITLE}>
          {NONE_VISIBLE_TEXT}
        </StateNotice>
      )}
      {FAMILIES.map((family) => {
        const own = reports.filter((r) => r.family === family);
        if (own.length === 0) return null;
        return (
          <Panel
            key={family}
            label={FAMILY_LABELS[family]}
            aside={own.length}
            isFlush
          >
            <RowList>
              {own.map((r) => (
                <ListRow
                  key={r.id}
                  title={r.title}
                  sub={r.answers}
                  href={reportHref({ report: r.id })}
                  aside={
                    <span className="m1-go" aria-hidden="true">
                      →
                    </span>
                  }
                />
              ))}
            </RowList>
          </Panel>
        );
      })}
      {can(viewer, "finance.cost") && (
        <p className="note">
          Κερδοφορία ανά Παραγωγή, Πελάτη και μήνα:{" "}
          <Link href={hrefOf("G3")}>Κόστος και ώρες</Link>. Οι Αναφορές δεν την
          ξαναφτιάχνουν.
        </p>
      )}
      {can(viewer, "reports.export") && (
        <p className="note">
          Για ό,τι δεν καλύπτουν οι έτοιμες Αναφορές:{" "}
          <Link href={hrefOf("M2")}>Εξαγωγή δεδομένων</Link>.
        </p>
      )}
    </>
  );
}

function ReportView(props: {
  viewer: Viewer;
  report: ReportDefinition;
  filters: ReportFilters;
}) {
  const { viewer, report, filters } = props;
  const body: ReportBodyProps = {
    report,
    filters,
    canExport: !!report.exportSpec && can(viewer, "reports.export"),
  };
  return (
    <>
      <p>
        <Link href={REPORTS_PATH}>← Όλες οι Αναφορές</Link>
      </p>
      <div className="card-title">
        <h2>{report.title}</h2>
      </div>
      <p className="muted">{report.answers}</p>
      <Suspense
        key={`${report.id}-${filters.period}-${filters.clientId ?? ""}-${filters.sellerId ?? ""}`}
        fallback={<p className="muted">Φορτώνει η Αναφορά…</p>}
      >
        {report.family === "finance" ? (
          <FinanceReport {...body} />
        ) : (
          <SalesReport {...body} />
        )}
      </Suspense>
      <details className="m1-basis">
        <summary>Πώς μετράει</summary>
        <p>{report.basis}</p>
      </details>
    </>
  );
}

function Content(props: SpacesReportsProps) {
  const { viewer, reportId, filters } = props;
  if (!can(viewer, "reports.view"))
    return (
      <StateNotice kind="denied" title="Χωρίς δικαίωμα">
        {NO_ACCESS_TEXT}
      </StateNotice>
    );
  if (!reportId) return <Catalogue viewer={viewer} />;
  const report = findReport(reportId);
  if (!report)
    return (
      <StateNotice kind="empty" title={UNKNOWN_REPORT_TITLE}>
        <p>{UNKNOWN_REPORT_TEXT}</p>
        <Link href={REPORTS_PATH}>← Όλες οι Αναφορές</Link>
      </StateNotice>
    );
  if (!report.isVisible(viewer))
    return (
      <StateNotice kind="denied" title="Χωρίς δικαίωμα">
        {REPORT_NO_ACCESS_TEXT}
      </StateNotice>
    );
  return <ReportView viewer={viewer} report={report} filters={filters} />;
}

export interface SpacesReportsProps {
  viewer: Viewer;
  reportId?: string;
  filters: ReportFilters;
}

// M1 Αναφορές στη νέα εμφάνιση (prototype `screens/M1.tsx`): κατάλογος ή μία Αναφορά (?report=), με τα φίλτρα στη
// διεύθυνση. Οι Αναφορές έρχονται από το μητρώο (catalog/)· η βάση ξαναελέγχει Δικαίωμα και ποσά σε κάθε RPC.
export function SpacesReports(props: SpacesReportsProps) {
  return (
    <div data-spaces>
      <Content {...props} />
    </div>
  );
}
