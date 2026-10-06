import Link from "next/link";

import {
  findReport,
  DEFAULT_PERIOD,
  type ReportDef,
  type ReportFamily,
} from "@/data/reports";
import {
  parsePeriod,
  periodRange,
  reportCapsOf,
  visibleReports,
} from "@/data/reports-access";
import type { RoleId } from "@/data/roles";
import { M1Filters } from "@/screens/m1-filters";
import { FinanceReport } from "@/screens/m1-finance";
import type { ReportBodyProps } from "@/screens/m1-model";
import { SalesReport } from "@/screens/m1-sales";
import {
  ErrorNotice,
  StateNotice,
  StateSwitcher,
  parseState,
  screenHref,
  type ScreenProps,
} from "@/screens/shared";

import "./m1.css";

const FAMILIES: readonly ReportFamily[] = ["οικονομικές", "πωλήσεις"];

function Catalogue({ role, state }: { role: RoleId; state?: string }) {
  const reports = visibleReports(role);
  return (
    <>
      {FAMILIES.map((family) => {
        const own = reports.filter((r) => r.family === family);
        if (own.length === 0) return null;
        return (
          <section key={family} className="m1-family">
            <h2>{family === "οικονομικές" ? "Οικονομικές" : "Πωλήσεις"}</h2>
            <div className="grid2">
              {own.map((r) => (
                <Link
                  key={r.id}
                  className="card m1-tile"
                  href={screenHref(role, "M1", { report: r.id, state })}
                >
                  <strong>{r.title}</strong>
                  <span className="muted">{r.answers}</span>
                </Link>
              ))}
            </div>
          </section>
        );
      })}
      {reportCapsOf(role).canSeeCost && (
        <p className="note">
          Κερδοφορία ανά Παραγωγή, Πελάτη και μήνα:{" "}
          <Link href={screenHref(role, "I7", {})}>Κερδοφορία (I7)</Link>. Οι
          Αναφορές δεν την ξαναφτιάχνουν.
        </p>
      )}
      {reportCapsOf(role).canExport && (
        <p className="note">
          Για ό,τι δεν καλύπτουν οι έτοιμες Αναφορές:{" "}
          <Link href={screenHref(role, "M2", {})}>Εξαγωγή δεδομένων (M2)</Link>.
        </p>
      )}
    </>
  );
}

function ReportView(props: {
  role: RoleId;
  report: ReportDef;
  query: ScreenProps["query"];
}) {
  const { role, report, query } = props;
  const state = parseState(query.state);
  const body: ReportBodyProps = {
    role,
    report,
    range: periodRange(parsePeriod(query.period) ?? DEFAULT_PERIOD),
    clientId: query.client,
    sellerId: query.seller,
    isEmpty: state === "empty",
    canExport: reportCapsOf(role).canExport,
  };
  return (
    <>
      <p>
        <Link href={screenHref(role, "M1", { state: query.state })}>
          ← Όλες οι Αναφορές
        </Link>
      </p>
      <div className="card-title">
        <h2>{report.title}</h2>
      </div>
      <p className="muted">{report.answers}</p>
      <M1Filters role={role} report={report} query={query} />
      {state === "error" ? (
        <ErrorNotice what={`την Αναφορά «${report.title}»`} />
      ) : report.family === "οικονομικές" ? (
        <FinanceReport {...body} />
      ) : (
        <SalesReport {...body} />
      )}
      <details className="m1-basis">
        <summary>Πώς μετράει</summary>
        <p>{report.basis}</p>
      </details>
    </>
  );
}

export function M1({ role, query }: ScreenProps) {
  const state = parseState(query.state);
  const header = (
    <StateSwitcher
      role={role}
      code="M1"
      state={state}
      keep={{
        report: query.report,
        period: query.period,
        client: query.client,
        seller: query.seller,
      }}
    />
  );
  if (!reportCapsOf(role).canSeeReports) {
    return (
      <>
        {header}
        <StateNotice kind="denied" title="Χωρίς δικαίωμα">
          Τις Αναφορές τις βλέπουν όσοι έχουν «Βλέπει Αναφορές».
        </StateNotice>
      </>
    );
  }
  const report = findReport(query.report);
  const isVisible =
    !!report && visibleReports(role).some((r) => r.id === report.id);
  if (report && !isVisible) {
    return (
      <>
        {header}
        <StateNotice kind="denied" title="Χωρίς δικαίωμα">
          Αυτή η Αναφορά διαβάζει δεδομένα που δεν βλέπεις.
        </StateNotice>
      </>
    );
  }
  return (
    <>
      {header}
      {report ? (
        <ReportView role={role} report={report} query={query} />
      ) : (
        <Catalogue role={role} state={query.state} />
      )}
    </>
  );
}
