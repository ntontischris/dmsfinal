import Link from "next/link";
import { Suspense } from "react";

import { can, type Viewer } from "@/modules/access";
import { hrefOf } from "@/spaces/data/screens";
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
import { Box, initialsOf } from "./m1-box";
import { FinanceReport } from "./m1-finance";
import type { ReportBodyProps } from "./m1-model";
import { MonthHero } from "./m1-month";
import { SalesReport } from "./m1-sales";

import "./m1.css";
import "./m1-lines.css";

const FAMILIES: readonly ReportFamily[] = ["finance", "sales"];
const FAMILY_LABELS: Readonly<Record<ReportFamily, string>> = {
  finance: "Οικονομικές",
  sales: "Πωλήσεις",
};

function Picker({ reports }: { reports: readonly ReportDefinition[] }) {
  return (
    <>
      {FAMILIES.map((family) => {
        const own = reports.filter((r) => r.family === family);
        if (own.length === 0) return null;
        return (
          <section key={family} className="m1-picker">
            <h2 className="m1-family">
              {FAMILY_LABELS[family]} · {own.length}
            </h2>
            <nav className="ml-shelf" aria-label={FAMILY_LABELS[family]}>
              {own.map((r) => (
                <Link key={r.id} href={reportHref({ report: r.id })}>
                  <span className="ml-mark" aria-hidden="true">
                    {initialsOf(r.title)}
                  </span>
                  <strong>{r.title}</strong>
                  <small>{r.answers}</small>
                </Link>
              ))}
            </nav>
          </section>
        );
      })}
    </>
  );
}

function Catalogue({ viewer }: { viewer: Viewer }) {
  const reports = visibleReports(viewer);
  return (
    <div className="m1-page">
      <p className="m1-intro">
        Διάλεξε μια Αναφορά· ανοίγει με τα φίλτρα της στη διεύθυνση.
      </p>
      <Suspense fallback={<p className="muted">Φορτώνει ο μήνας…</p>}>
        <MonthHero viewer={viewer} />
      </Suspense>
      {reports.length === 0 && (
        <StateNotice kind="empty" title={NONE_VISIBLE_TITLE}>
          {NONE_VISIBLE_TEXT}
        </StateNotice>
      )}
      <Picker reports={reports} />
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
    </div>
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
    <div className="m1-page">
      <header className="ml-hero">
        <span className="ml-hero-mono" aria-hidden="true">
          {initialsOf(report.title)}
        </span>
        <div>
          <span className="ml-tag">{FAMILY_LABELS[report.family]}</span>
          <h2>{report.title}</h2>
          <p>{report.answers}</p>
        </div>
        <div className="ml-quick">
          <Link href={REPORTS_PATH}>← Όλες οι Αναφορές</Link>
        </div>
      </header>
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
      <Box title="Πώς μετράει" hint="η βάση του υπολογισμού">
        <p>{report.basis}</p>
      </Box>
    </div>
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
