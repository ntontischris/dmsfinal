"use client";

import { useState } from "react";

import { filterRows } from "../helpers";
import { BUCKET_LABELS, KIND_LABELS } from "../labels";
import type { AgreementRowView, BucketFilter, KindFilter } from "../types";
import { AgreementLine } from "./d1-agreement-line";

import "../../finance/spaces/money-lines.css";
import "./d1.css";
import "./d1-lines.css";

interface AgreementsTableProps {
  rows: readonly AgreementRowView[];
  // Το ποσό μόνο όταν ο Χρήστης «Βλέπει ποσά» (αλλιώς η βάση στέλνει null).
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

const countLabel = (count: number): string =>
  count === 1 ? "1 Συμφωνία" : `${count} Συμφωνίες`;

// Η λίστα Συμφωνιών ως γραμμές των «Χρημάτων»: Προβολή, αναζήτηση και Είδος στον browser.
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
      <div className="d1-row d1l-views">
        <div
          className="d1-seg ml-quick"
          role="group"
          aria-label="Ποιες Συμφωνίες"
        >
          {VIEWS.map((item) => (
            <button
              key={item}
              type="button"
              aria-pressed={item === view}
              onClick={() => setView(item)}
            >
              {BUCKET_LABELS[item]}
            </button>
          ))}
        </div>
      </div>
      <div className="d1-row">
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
          <span className="ml-quick">
            <button type="button" onClick={resetFilters}>
              Δείξε όλες
            </button>
          </span>
        </div>
      ) : (
        <table className="ml-table ml-list d1l-list">
          <thead>
            <tr>
              <th>Πελάτης</th>
              <th>Συμφωνία</th>
              {showAmount && <th>Ποσό</th>}
            </tr>
          </thead>
          <tbody>
            {visible.map((row) => (
              <AgreementLine
                key={row.id}
                row={row}
                showAmount={showAmount}
                canSeeCost={canSeeCost}
              />
            ))}
          </tbody>
        </table>
      )}
    </>
  );
}
