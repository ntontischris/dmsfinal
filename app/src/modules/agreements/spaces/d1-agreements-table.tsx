"use client";

import Link from "next/link";
import { useState } from "react";

import { Entity, Person } from "@/spaces/kit/parts";
import { Badge, type BadgeTone } from "@/spaces/screens/shared";

import { filterRows } from "../helpers";
import { BUCKET_LABELS, KIND_LABELS } from "../labels";
import type {
  AgreementRowView,
  Bucket,
  BucketFilter,
  KindFilter,
} from "../types";

import "./d1.css";

interface AgreementsTableProps {
  rows: readonly AgreementRowView[];
  // Η στήλη του ποσού μόνο όταν ο Χρήστης «Βλέπει ποσά» (αλλιώς η βάση στέλνει null).
  showAmount: boolean;
  canSeeCost: boolean;
}

const VIEWS: readonly BucketFilter[] = [
  "open",
  "proposal",
  "active",
  "closed",
  "all",
];
const KINDS: readonly { id: KindFilter; label: string }[] = [
  { id: "all", label: "Όλα τα είδη" },
  { id: "monthly", label: KIND_LABELS.monthly },
  { id: "one_off", label: KIND_LABELS.one_off },
];

// Προτάσεις περιμένουν τον πελάτη, ενεργές = έμφαση, κλειστές ξεθωριάζουν.
const BUCKET_TONE: Readonly<Record<Bucket, BadgeTone | undefined>> = {
  proposal: "waiting",
  active: "strong",
  closed: "faded",
};

const countLabel = (count: number): string =>
  count === 1 ? "1 Συμφωνία" : `${count} Συμφωνίες`;

// Η λίστα Συμφωνιών (prototype `screens/d1-agreements-table.tsx`): Προβολή, αναζήτηση και Είδος στον browser.
export function AgreementsTable({
  rows,
  showAmount,
  canSeeCost,
}: AgreementsTableProps) {
  const [view, setView] = useState<BucketFilter>("open");
  const [kind, setKind] = useState<KindFilter>("all");
  const [text, setText] = useState("");
  const visible = filterRows(rows, { query: text, kind, bucket: view });

  const resetFilters = () => {
    setView("all");
    setKind("all");
    setText("");
  };

  return (
    <>
      <div className="toolbar">
        <div className="d1-seg" role="group" aria-label="Ποιες Συμφωνίες">
          {VIEWS.map((item) => (
            <button
              key={item}
              type="button"
              className="button"
              aria-pressed={item === view}
              onClick={() => setView(item)}
            >
              {BUCKET_LABELS[item]}
            </button>
          ))}
        </div>
      </div>
      <div className="toolbar">
        <input
          className="input grow"
          type="search"
          placeholder="Αναζήτηση πελάτη ή Συμφωνίας…"
          aria-label="Αναζήτηση πελάτη ή Συμφωνίας"
          value={text}
          onChange={(event) => setText(event.target.value)}
        />
        <select
          className="select"
          aria-label="Είδος"
          value={kind}
          onChange={(event) => setKind(event.target.value as KindFilter)}
        >
          {KINDS.map((item) => (
            <option key={item.id} value={item.id}>
              {item.label}
            </option>
          ))}
        </select>
        <span className="muted" aria-live="polite">
          {countLabel(visible.length)}
        </span>
      </div>
      {visible.length === 0 ? (
        <div className="stack">
          <p className="muted">Καμία Συμφωνία δεν ταιριάζει με τα φίλτρα.</p>
          <button type="button" className="button" onClick={resetFilters}>
            Δείξε όλες
          </button>
        </div>
      ) : (
        <div className="scroll">
          <table className="rtable">
            <thead>
              <tr>
                <th>Πελάτης</th>
                <th>Συμφωνία</th>
                <th>Είδος</th>
                <th>Κατάσταση</th>
                {showAmount && <th className="num">Ποσό</th>}
                <th>Χρόνος</th>
                <th>Υπεύθυνος</th>
              </tr>
            </thead>
            <tbody>
              {visible.map((row) => (
                <AgreementTableRow
                  key={row.id}
                  row={row}
                  showAmount={showAmount}
                  canSeeCost={canSeeCost}
                />
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}

function AgreementTableRow({
  row,
  showAmount,
  canSeeCost,
}: {
  row: AgreementRowView;
  showAmount: boolean;
  canSeeCost: boolean;
}) {
  return (
    <tr>
      <td data-label="Πελάτης">
        <Entity name={row.clientName} href={row.clientHref} />
      </td>
      <td data-label="Συμφωνία">
        <Link className="part-title" href={row.href}>
          {row.title}
        </Link>
      </td>
      <td data-label="Είδος">
        <span className="part-sub">{row.kindLabel}</span>
      </td>
      <td data-label="Κατάσταση">
        <span className="d1-cell">
          <Badge tone={row.isAttention ? "attention" : BUCKET_TONE[row.bucket]}>
            {row.statusLabel}
          </Badge>
          {row.hasChangeRequests && <Badge tone="attention">Ζήτησε αλλαγές</Badge>}
          {canSeeCost && row.isLowMargin && (
            <Badge tone="attention">χαμηλό περιθώριο</Badge>
          )}
        </span>
      </td>
      {showAmount && (
        <td className="num" data-label="Ποσό">
          <span className="d1-cell">
            <strong>{row.amount ?? "—"}</strong>
            {row.discountNote && (
              <span className="d1-small">{row.discountNote}</span>
            )}
          </span>
        </td>
      )}
      <td data-label="Χρόνος">
        <span className="d1-cell">
          <span>{row.timeText}</span>
          {row.expiryText && <Badge tone="attention">{row.expiryText}</Badge>}
        </span>
      </td>
      <td data-label="Υπεύθυνος">
        {row.managerName ? <Person name={row.managerName} /> : "—"}
      </td>
    </tr>
  );
}
