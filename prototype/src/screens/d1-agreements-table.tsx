"use client";

import Link from "next/link";
import { useState } from "react";

import { Badge } from "@/screens/shared";

import "./d1.css";

export type AgreementBucket = "proposal" | "active" | "closed";

export interface AgreementRow {
  id: string;
  href: string;
  clientHref: string;
  clientName: string;
  title: string;
  kind: "μηνιαία" | "εφάπαξ";
  bucket: AgreementBucket;
  status: string;
  isAttention: boolean;
  isLowMargin: boolean;
  amount: string;
  discount: string | null;
  time: string;
  expiresLabel: string | null;
  owner: string;
}

interface AgreementsTableProps {
  rows: readonly AgreementRow[];
}

const VIEWS = ["Ανοιχτές", "Προτάσεις", "Ενεργές", "Κλειστές", "Όλες"] as const;
type View = (typeof VIEWS)[number];
const KINDS = ["Όλα τα είδη", "μηνιαία", "εφάπαξ"] as const;
type KindFilter = (typeof KINDS)[number];

const matchesView = (row: AgreementRow, view: View): boolean => {
  if (view === "Όλες") return true;
  if (view === "Ανοιχτές") return row.bucket !== "closed";
  if (view === "Προτάσεις") return row.bucket === "proposal";
  if (view === "Ενεργές") return row.bucket === "active";
  return row.bucket === "closed";
};

const matchesText = (row: AgreementRow, text: string): boolean => {
  const needle = text.trim().toLowerCase();
  return (
    !needle ||
    row.clientName.toLowerCase().includes(needle) ||
    row.title.toLowerCase().includes(needle)
  );
};

const countLabel = (count: number): string =>
  count === 1 ? "1 Συμφωνία" : `${count} Συμφωνίες`;

export function AgreementsTable({ rows }: AgreementsTableProps) {
  const [view, setView] = useState<View>("Ανοιχτές");
  const [kind, setKind] = useState<KindFilter>("Όλα τα είδη");
  const [text, setText] = useState("");

  const visible = rows.filter(
    (row) =>
      matchesView(row, view) &&
      (kind === "Όλα τα είδη" || row.kind === kind) &&
      matchesText(row, text),
  );

  const resetFilters = () => {
    setView("Όλες");
    setKind("Όλα τα είδη");
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
              {item}
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
            <option key={item}>{item}</option>
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
                <th className="num">Ποσό</th>
                <th>Χρόνος</th>
                <th>Υπεύθυνος</th>
              </tr>
            </thead>
            <tbody>
              {visible.map((row) => (
                <AgreementTableRow key={row.id} row={row} />
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}

function AgreementTableRow({ row }: { row: AgreementRow }) {
  return (
    <tr>
      <td data-label="Πελάτης">
        <Link href={row.clientHref}>{row.clientName}</Link>
      </td>
      <td data-label="Συμφωνία">
        <Link href={row.href}>{row.title}</Link>
      </td>
      <td data-label="Είδος">{row.kind}</td>
      <td data-label="Κατάσταση">
        <span className="d1-cell">
          <Badge tone={row.isAttention ? "attention" : undefined}>
            {row.status}
          </Badge>
          {row.isLowMargin && <Badge tone="attention">χαμηλό περιθώριο</Badge>}
        </span>
      </td>
      <td className="num" data-label="Ποσό">
        <span className="d1-cell">
          <span>{row.amount}</span>
          {row.discount && <span className="d1-small">{row.discount}</span>}
        </span>
      </td>
      <td data-label="Χρόνος">
        <span className="d1-cell">
          <span>{row.time}</span>
          {row.expiresLabel && (
            <Badge tone="attention">{row.expiresLabel}</Badge>
          )}
        </span>
      </td>
      <td data-label="Υπεύθυνος">{row.owner}</td>
    </tr>
  );
}
