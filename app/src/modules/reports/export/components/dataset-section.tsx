import Link from "next/link";
import type { ReactNode } from "react";

import { Badge } from "@/components/ui/badge";
import { Panel } from "@/components/ui/panel";
import { Segmented } from "@/components/ui/segmented";
import { AUDIT_PATH, AUDIT_TITLE } from "@/modules/audit";

import { dateLabel } from "@/modules/reports/format";
import { PERIOD_CODES, type PeriodCode } from "@/modules/reports/url";
import { DATASETS, type DatasetDefinition } from "../datasets";
import {
  AUDIT_DATASET_NOTE,
  COLUMNS_LABEL,
  COST_NOTE,
  DATASET_SECTION,
  DOWNLOAD_NOTE,
  EMPTY_ROWS_NOTE,
  FORMATS,
  NO_PERIOD_NOTE,
  PARTIAL_NOTE,
  PERIOD_LABELS,
  PROFITABILITY_NOTE,
  ROWS_LABEL,
  ROW_IS,
  STEP_DATASET,
  STEP_FORMAT,
  STEP_PERIOD,
  STEP_PREVIEW,
} from "../labels";
import type { ExportFormat } from "../report-export";
import { exportHref, type ExportQuery } from "../url";
import type { ExportOverview } from "../view-schema";
import { DatasetDownload } from "./dataset-download";

interface DatasetSectionProps {
  overview: ExportOverview;
  dataset: DatasetDefinition;
  period: PeriodCode;
  format: ExportFormat;
  month?: string;
}

function Step({
  number,
  title,
  children,
}: {
  number: number;
  title: string;
  children: ReactNode;
}) {
  return (
    <li className="grid gap-2">
      <h3 className="m-0 text-sm font-semibold">
        {number}. {title}
      </h3>
      {children}
    </li>
  );
}

const FORMAT_ORDER: readonly ExportFormat[] = ["xlsx", "csv"];

// M2 «Εξαγωγή συνόλου δεδομένων»: τι, Περίοδος (όπου ισχύει), μορφή, τι θα περιέχει, «Εξαγωγή». Οι επιλογές στη διεύθυνση.
export function DatasetSection({
  overview,
  dataset,
  period,
  format,
  month,
}: DatasetSectionProps) {
  const item = overview.items.find((entry) => entry.code === dataset.code);
  const usesPeriod = item?.usesPeriod ?? true;
  const rowCount = item?.rowCount ?? 0;
  const keep: ExportQuery = { dataset: dataset.code, period, format, month };
  const visible = DATASETS.filter((d) =>
    overview.items.some((entry) => entry.code === d.code),
  );
  const seesCost = overview.items.some((entry) => entry.code === "expenses");
  const step = (n: number): number => (usesPeriod ? n : n - 1);
  return (
    <Panel label={DATASET_SECTION}>
      <ol className="m-0 grid list-none gap-5 p-0">
        <Step number={1} title={STEP_DATASET}>
          <Segmented
            label={STEP_DATASET}
            options={visible.map((d) => ({
              label: d.title,
              href: exportHref({ ...keep, dataset: d.code }),
              isCurrent: d.code === dataset.code,
            }))}
          />
          <p className="m-0 text-sm text-muted-foreground">
            {ROW_IS(dataset.row)}
          </p>
          <p className="m-0 text-sm text-muted-foreground">
            {seesCost ? PROFITABILITY_NOTE : COST_NOTE}
          </p>
          {dataset.code === "audit" && (
            <p className="m-0 text-sm text-muted-foreground">
              {AUDIT_DATASET_NOTE} <Link href={AUDIT_PATH}>{AUDIT_TITLE}</Link>.
            </p>
          )}
        </Step>
        {usesPeriod ? (
          <Step number={2} title={STEP_PERIOD}>
            <Segmented
              label={STEP_PERIOD}
              options={PERIOD_CODES.map((code) => ({
                label: PERIOD_LABELS[code],
                href: exportHref({ ...keep, period: code }),
                isCurrent: code === period,
              }))}
            />
            <p className="m-0 text-sm text-muted-foreground">
              {dateLabel(overview.period.from)} –{" "}
              {dateLabel(overview.period.to)}
              {overview.period.isPartial && ` · ${PARTIAL_NOTE}`}
            </p>
          </Step>
        ) : (
          <p className="m-0 text-sm text-muted-foreground">{NO_PERIOD_NOTE}</p>
        )}
        <Step number={step(3)} title={STEP_FORMAT}>
          <Segmented
            label={STEP_FORMAT}
            options={FORMAT_ORDER.map((f) => ({
              label: FORMATS[f].label,
              href: exportHref({ ...keep, format: f }),
              isCurrent: f === format,
            }))}
          />
          <p className="m-0 text-sm text-muted-foreground">
            {FORMATS[format].hint}
          </p>
        </Step>
        <Step number={step(4)} title={STEP_PREVIEW}>
          <dl className="m-0 grid gap-2 text-sm">
            <dt className="kit-label">{COLUMNS_LABEL}</dt>
            <dd className="m-0 flex flex-wrap gap-1">
              {dataset.columns.map((column) => (
                <Badge key={column.key}>{column.header}</Badge>
              ))}
            </dd>
            <dt className="kit-label">{ROWS_LABEL}</dt>
            <dd className="m-0 tabular-nums">{rowCount}</dd>
          </dl>
          {rowCount === 0 && (
            <p className="m-0 text-sm text-muted-foreground">
              {EMPTY_ROWS_NOTE}
            </p>
          )}
        </Step>
        <li className="grid gap-2">
          <DatasetDownload
            dataset={dataset.code}
            period={usesPeriod ? period : undefined}
            format={format}
          />
          <p className="m-0 text-sm text-muted-foreground">{DOWNLOAD_NOTE}</p>
        </li>
      </ol>
    </Panel>
  );
}
