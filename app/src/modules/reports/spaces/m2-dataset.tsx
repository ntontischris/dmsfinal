import Link from "next/link";

import { AUDIT_PATH, AUDIT_TITLE } from "@/modules/audit";
import { FilterBar } from "@/spaces/kit/filter-bar";
import { Panel } from "@/spaces/kit/panel";
import { Badge } from "@/spaces/screens/shared";

import type { DatasetDefinition } from "../export/datasets";
import {
  AUDIT_DATASET_NOTE,
  COST_NOTE,
  DOWNLOAD_NOTE,
  EMPTY_ROWS_NOTE,
  FORMATS,
} from "../export/labels";
import type { ExportFormat } from "../export/report-export";
import type { ExportQuery } from "../export/url";
import { rowCountLabel } from "../export/components/dataset-section";
import type { PeriodCode } from "../url";
import { periodLabelWithDates } from "./m1-adapter";
import type { KnownPeriod } from "./m1-finance-parts";
import { DatasetButton } from "./m2-buttons";
import { m2Href } from "./m2-model";

// Εξαγωγή συνόλου δεδομένων (prototype `screens/m2-dataset.tsx`): τι, Περίοδος (όπου ισχύει), μορφή, τι θα περιέχει,
// «Εξαγωγή». Ποια σύνολα, αν έχουν Περίοδο και πόσες γραμμές: από τη βάση (export_datasets).

const FORMAT_ORDER: readonly ExportFormat[] = ["xlsx", "csv"];

interface ChipsProps {
  query: ExportQuery;
  label: string;
  current: string;
  options: readonly {
    value: string;
    label: string;
    change: Partial<ExportQuery>;
  }[];
}

// Πολλές επιλογές (Σύνολα, Περίοδοι): μία κάρτα με λίστα από κάτω, όπως τα φίλτρα της εφαρμογής.
function Choice({ query, label, current, options }: ChipsProps) {
  return (
    <FilterBar
      label={label}
      filters={[
        {
          label,
          options: options.map((o) => ({
            label: o.label,
            href: m2Href(query, o.change),
            isCurrent: o.value === current,
          })),
        },
      ]}
    />
  );
}

// Δύο επιλογές (Μορφή): κουμπάκια δίπλα-δίπλα.
function Chips({ query, label, current, options }: ChipsProps) {
  return (
    <nav className="m2-chips" aria-label={label}>
      {options.map((o) => (
        <Link
          key={o.value}
          className="badge"
          data-tone={o.value === current ? "strong" : undefined}
          aria-current={o.value === current ? "true" : undefined}
          href={m2Href(query, o.change)}
        >
          {o.label}
        </Link>
      ))}
    </nav>
  );
}

function Preview(props: { dataset: DatasetDefinition; rowCount: number }) {
  return (
    <>
      <dl className="dl">
        <dt>Στήλες</dt>
        <dd className="m2-cols">
          {props.dataset.columns.map((c) => (
            <Badge key={c.key}>{c.header}</Badge>
          ))}
        </dd>
        <dt>Γραμμές</dt>
        <dd>{rowCountLabel(props.rowCount)}</dd>
      </dl>
      {props.rowCount === 0 && <p className="note">{EMPTY_ROWS_NOTE}</p>}
    </>
  );
}

export interface DatasetSectionProps {
  query: ExportQuery;
  datasets: readonly DatasetDefinition[];
  dataset: DatasetDefinition;
  usesPeriod: boolean;
  rowCount: number;
  period: PeriodCode;
  periods: readonly KnownPeriod[];
  format: ExportFormat;
  canSeeCost: boolean;
}

export function DatasetSection(props: DatasetSectionProps) {
  const { query, datasets, dataset, usesPeriod, period, format } = props;
  const periodDef = props.periods.find((p) => p.code === period);
  const what = [
    dataset.title,
    usesPeriod && periodDef ? periodLabelWithDates(periodDef) : undefined,
    FORMATS[format].label,
  ]
    .filter(Boolean)
    .join(" · ");
  const showsPeriod = usesPeriod && props.periods.length > 0;
  const step = (n: number): number => (showsPeriod ? n : n - 1);
  return (
    <div className="m2-section">
      <Panel label="Εξαγωγή συνόλου δεδομένων">
        <ol className="m2-steps">
          <li>
            <strong>1. Τι θέλεις να εξάγεις</strong>
            <Choice
              query={query}
              label="Σύνολο δεδομένων"
              current={dataset.code}
              options={datasets.map((d) => ({
                value: d.code,
                label: d.title,
                change: { dataset: d.code },
              }))}
            />
            <span className="muted">Μία γραμμή = {dataset.row}.</span>
            {!props.canSeeCost && <p className="note">{COST_NOTE}</p>}
            {dataset.code === "audit" && (
              <p className="note">
                {AUDIT_DATASET_NOTE}{" "}
                <Link href={AUDIT_PATH}>{AUDIT_TITLE}</Link>.
              </p>
            )}
          </li>
          {showsPeriod && (
            <li>
              <strong>2. Περίοδος</strong>
              <Choice
                query={query}
                label="Περίοδος"
                current={period}
                options={props.periods.map((p) => ({
                  value: p.code,
                  label: periodLabelWithDates(p),
                  change: { period: p.code },
                }))}
              />
            </li>
          )}
          <li>
            <strong>{step(3)}. Μορφή αρχείου</strong>
            <Chips
              query={query}
              label="Μορφή"
              current={format}
              options={FORMAT_ORDER.map((f) => ({
                value: f,
                label: FORMATS[f].label,
                change: { format: f },
              }))}
            />
            <span className="muted">{FORMATS[format].hint}</span>
          </li>
          <li>
            <strong>{step(4)}. Τι θα περιέχει</strong>
            <Preview dataset={dataset} rowCount={props.rowCount} />
          </li>
          <li>
            <div className="btn-row">
              <DatasetButton
                dataset={dataset.code}
                period={usesPeriod ? period : undefined}
                format={format}
                what={what}
              />
            </div>
            <p className="note">{DOWNLOAD_NOTE}</p>
          </li>
        </ol>
      </Panel>
    </div>
  );
}
