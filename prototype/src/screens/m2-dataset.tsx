import Link from "next/link";

import {
  EXPORT_FORMATS,
  PERIODS,
  type ExportDataset,
  type ExportFormat,
  type PeriodId,
} from "@/data/reports";
import type { RoleId } from "@/data/roles";
import { m2Href, rowCountOf } from "@/screens/m2-model";
import { Badge, type ScreenQuery } from "@/screens/shared";

interface ChipsProps {
  role: RoleId;
  query: ScreenQuery;
  name: string;
  label: string;
  current: string;
  options: readonly { value: string; label: string }[];
}

function Chips({ role, query, name, label, current, options }: ChipsProps) {
  return (
    <nav className="m2-chips" aria-label={label}>
      {options.map((o) => (
        <Link
          key={o.value}
          className="badge"
          data-tone={o.value === current ? "strong" : undefined}
          aria-current={o.value === current ? "true" : undefined}
          href={m2Href(role, query, { [name]: o.value })}
        >
          {o.label}
        </Link>
      ))}
    </nav>
  );
}

function Preview(props: { dataset: ExportDataset; period: PeriodId }) {
  const count = rowCountOf(props.dataset, props.period);
  return (
    <dl className="dl">
      <dt>Στήλες</dt>
      <dd className="m2-cols">
        {props.dataset.columns.map((c) => (
          <Badge key={c}>{c}</Badge>
        ))}
      </dd>
      <dt>Γραμμές</dt>
      <dd>{count ?? "—"}</dd>
    </dl>
  );
}

interface DatasetSectionProps {
  role: RoleId;
  query: ScreenQuery;
  datasets: readonly ExportDataset[];
  dataset: ExportDataset;
  period: PeriodId;
  format: ExportFormat;
  canSeeCost: boolean;
}

export function DatasetSection(props: DatasetSectionProps) {
  const { role, query, datasets, dataset, period, format } = props;
  const hint = EXPORT_FORMATS.find((f) => f.id === format)?.hint;
  const step = (n: number): number => (dataset.usesPeriod ? n : n - 1);
  return (
    <section className="card m2-section">
      <h2 className="card-title">Εξαγωγή συνόλου δεδομένων</h2>
      <ol className="m2-steps">
        <li>
          <strong>1. Τι θέλεις να εξάγεις</strong>
          <Chips
            role={role}
            query={query}
            name="dataset"
            label="Σύνολο δεδομένων"
            current={dataset.id}
            options={datasets.map((d) => ({ value: d.id, label: d.label }))}
          />
          <span className="muted">Μία γραμμή = {dataset.rows}.</span>
          {!props.canSeeCost && (
            <p className="note">
              Έξοδα και Κερδοφορία τα εξάγει μόνο όποιος βλέπει κόστος.
            </p>
          )}
        </li>
        {dataset.usesPeriod && (
          <li>
            <strong>2. Περίοδος</strong>
            <Chips
              role={role}
              query={query}
              name="period"
              label="Περίοδος"
              current={period}
              options={PERIODS.map((p) => ({ value: p.id, label: p.label }))}
            />
          </li>
        )}
        <li>
          <strong>{step(3)}. Μορφή αρχείου</strong>
          <Chips
            role={role}
            query={query}
            name="format"
            label="Μορφή"
            current={format}
            options={EXPORT_FORMATS.map((f) => ({
              value: f.id,
              label: f.label,
            }))}
          />
          <span className="muted">{hint}</span>
        </li>
        <li>
          <strong>{step(4)}. Τι θα περιέχει</strong>
          <Preview dataset={dataset} period={period} />
        </li>
        <li>
          <div className="btn-row">
            <button type="button" className="button" data-primary="true">
              Εξαγωγή
            </button>
          </div>
          <p className="note">
            Το αρχείο κατεβαίνει αμέσως. Κάθε εξαγωγή γράφεται στο Ίχνος
            ενεργειών (ποιος, τι, πότε, με ποια φίλτρα).
          </p>
        </li>
      </ol>
    </section>
  );
}
