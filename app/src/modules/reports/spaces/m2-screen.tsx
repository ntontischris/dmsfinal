import Link from "next/link";
import { Suspense } from "react";

import { can, type Viewer } from "@/modules/access";
import { hrefOf } from "@/spaces/data/screens";
import { ErrorNotice, StateNotice } from "@/spaces/screens/shared";

import { DATASETS, type DatasetCode } from "../export/datasets";
import {
  EXPORT_NO_ACCESS,
  NO_DATASETS_TEXT,
  NO_DATASETS_TITLE,
} from "../export/labels";
import { getExportOverview } from "../export/queries";
import type { ExportFormat } from "../export/report-export";
import type { ExportQuery } from "../export/url";
import type { PeriodCode } from "../url";
import { Box } from "./m1-box";
import { loadPeriods } from "./m1-finance-parts";
import { DatasetSection } from "./m2-dataset";
import { LogSection } from "./m2-log";
import { PackSection } from "./m2-pack";

import "./m2.css";

export interface SpacesExportProps {
  viewer: Viewer;
  dataset?: DatasetCode;
  period: PeriodCode;
  format: ExportFormat;
  month?: string;
  // Αν η διεύθυνση είχε ήδη επιλογές της «Άλλης εξαγωγής» (τότε ανοίγει).
  hasDatasetChoice: boolean;
}

// Πακέτο λογιστή και σύνολα: ό,τι δείχνει η βάση για αυτόν τον Χρήστη (ποια σύνολα, Περίοδος, πόσες γραμμές).
async function ExportBody(props: Omit<SpacesExportProps, "viewer">) {
  const { period, format, month } = props;
  const [result, periods] = await Promise.all([
    getExportOverview(period),
    loadPeriods(),
  ]);
  if (!result.ok) return <ErrorNotice what="η Εξαγωγή" />;
  const overview = result.data;
  const datasets = DATASETS.filter((d) =>
    overview.items.some((item) => item.code === d.code),
  );
  if (datasets.length === 0)
    return (
      <StateNotice kind="empty" title={NO_DATASETS_TITLE}>
        {NO_DATASETS_TEXT}
      </StateNotice>
    );
  const items = datasets.map((dataset) => {
    const entry = overview.items.find((e) => e.code === dataset.code);
    return {
      dataset,
      usesPeriod: entry?.usesPeriod ?? true,
      rowCount: entry?.rowCount ?? 0,
    };
  });
  // Ό,τι γράφει η διεύθυνση· όταν είχε ήδη επιλογές, η «Άλλη εξαγωγή» μένει ανοιχτή.
  const query: ExportQuery = { dataset: props.dataset, period, format, month };
  const seesFinance = overview.items.some((entry) => entry.code === "invoices");
  return (
    <>
      {seesFinance && <PackSection today={overview.today} query={query} />}
      <Box
        title={seesFinance ? "Άλλη εξαγωγή" : "Εξαγωγή δεδομένων"}
        hint={`${items.length} σύνολα δεδομένων για όποια περίοδο θέλεις, σε Excel ή CSV`}
        isOpen={!seesFinance || props.hasDatasetChoice}
      >
        <DatasetSection
          query={query}
          items={items}
          current={props.dataset}
          period={period}
          periods={periods ?? []}
          format={format}
          canSeeCost={overview.items.some((e) => e.code === "expenses")}
        />
      </Box>
    </>
  );
}

// M2 Εξαγωγή στη νέα εμφάνιση (prototype `screens/M2.tsx`): Πακέτο λογιστή, «Άλλη εξαγωγή», Ιστορικό εξαγωγών.
// Θέλει «Εξάγει δεδομένα»· η βάση ξαναελέγχει Δικαίωμα και πηγή σε κάθε εξαγωγή και γράφει Ίχνος.
export function SpacesExport({ viewer, ...props }: SpacesExportProps) {
  if (!can(viewer, "reports.export"))
    return (
      <div data-spaces>
        <StateNotice kind="denied" title="Χωρίς δικαίωμα">
          {EXPORT_NO_ACCESS}
        </StateNotice>
      </div>
    );
  return (
    <div data-spaces className="m1-page ml-stack">
      <p className="m1-intro">
        Κατέβασε το πακέτο του μήνα για τον λογιστή ή ένα σύνολο δεδομένων σε
        Excel ή CSV.
      </p>
      <Suspense fallback={<p className="muted">Φορτώνει η Εξαγωγή…</p>}>
        <ExportBody {...props} />
      </Suspense>
      <Suspense fallback={null}>
        <LogSection />
      </Suspense>
      <p className="note">
        Οι έτοιμες Αναφορές είναι στις <Link href={hrefOf("M1")}>Αναφορές</Link>
        .
      </p>
    </div>
  );
}
