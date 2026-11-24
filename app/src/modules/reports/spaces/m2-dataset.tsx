import Link from "next/link";

import { AUDIT_PATH, AUDIT_TITLE } from "@/modules/audit";
import { FilterBar } from "@/spaces/kit/filter-bar";
import { Badge } from "@/spaces/screens/shared";

import type { DatasetCode, DatasetDefinition } from "../export/datasets";
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
import { Box, initialsOf } from "./m1-box";
import { DatasetButton } from "./m2-buttons";
import { m2Href } from "./m2-model";

import "../../finance/spaces/money-lines.css";

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

export interface DatasetItem {
  dataset: DatasetDefinition;
  usesPeriod: boolean;
  rowCount: number;
}

export interface DatasetSectionProps {
  query: ExportQuery;
  items: readonly DatasetItem[];
  // Το σύνολο που έγραφε η διεύθυνση (?dataset=): η γραμμή του φαίνεται τονισμένη.
  current?: DatasetCode;
  period: PeriodCode;
  periods: readonly KnownPeriod[];
  format: ExportFormat;
  canSeeCost: boolean;
}

function DatasetLine(props: {
  item: DatasetItem;
  periodText?: string;
  format: ExportFormat;
  period: PeriodCode;
  isCurrent: boolean;
}) {
  const { item, periodText, format } = props;
  const { dataset, usesPeriod, rowCount } = item;
  const what = [
    dataset.title,
    usesPeriod ? periodText : undefined,
    FORMATS[format].label,
  ]
    .filter(Boolean)
    .join(" · ");
  return (
    <li
      className="ml-line"
      data-faded={rowCount === 0 || undefined}
      aria-current={props.isCurrent ? "true" : undefined}
    >
      <span className="ml-thumb" aria-hidden="true">
        {initialsOf(dataset.title)}
      </span>
      <span className="ml-main">
        <span className="ml-tag">
          {rowCountLabel(rowCount)}
          {usesPeriod && periodText ? ` · ${periodText}` : " · χωρίς Περίοδο"}
        </span>
        <strong>{dataset.title}</strong>
        <small>
          Μία γραμμή = {dataset.row}.{rowCount === 0 && ` ${EMPTY_ROWS_NOTE}`}
        </small>
      </span>
      <span className="ml-quick">
        <DatasetButton
          dataset={dataset.code}
          period={usesPeriod ? props.period : undefined}
          format={format}
          what={what}
        />
      </span>
    </li>
  );
}

function ColumnsBox({ items }: { items: readonly DatasetItem[] }) {
  return (
    <Box title="Στήλες κάθε συνόλου" hint="τι θα περιέχει κάθε αρχείο">
      <dl className="ml-kv">
        {items.map(({ dataset }) => (
          <div key={dataset.code} className="m2-sheet">
            <dt>{dataset.title}</dt>
            <dd className="m2-cols">
              {dataset.columns.map((c) => (
                <Badge key={c.key}>{c.header}</Badge>
              ))}
            </dd>
          </div>
        ))}
      </dl>
    </Box>
  );
}

// Περίοδος (όπου ισχύει) και μορφή: μία μαλακή σειρά πάνω από τα σύνολα, κοινή για όλα.
function Options(props: DatasetSectionProps & { showsPeriod: boolean }) {
  const { query, period, format } = props;
  return (
    <div className="m1-choices">
      {props.showsPeriod && (
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
      )}
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
    </div>
  );
}

export function DatasetSection(props: DatasetSectionProps) {
  const { items, period, format } = props;
  const periodDef = props.periods.find((p) => p.code === period);
  const periodText = periodDef ? periodLabelWithDates(periodDef) : undefined;
  const showsPeriod =
    items.some((item) => item.usesPeriod) && props.periods.length > 0;
  return (
    <div className="ml-stack">
      <Options {...props} showsPeriod={showsPeriod} />
      <ul className="ml-list">
        {items.map((item) => (
          <DatasetLine
            key={item.dataset.code}
            item={item}
            periodText={periodText}
            format={format}
            period={period}
            isCurrent={item.dataset.code === props.current}
          />
        ))}
      </ul>
      {!props.canSeeCost && <p className="note">{COST_NOTE}</p>}
      {items.some((item) => item.dataset.code === "audit") && (
        <p className="note">
          {AUDIT_DATASET_NOTE} <Link href={AUDIT_PATH}>{AUDIT_TITLE}</Link>.
        </p>
      )}
      <p className="note">{DOWNLOAD_NOTE}</p>
      <ColumnsBox items={items} />
    </div>
  );
}
