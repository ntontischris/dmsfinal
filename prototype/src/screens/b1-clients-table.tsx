"use client";

import Link from "next/link";
import { useState } from "react";

import { Badge } from "@/screens/shared";

export interface ClientRow {
  id: string;
  href: string;
  name: string;
  city: string;
  status: string;
  owner: string;
  openOpportunities: number;
  activeAgreements: number;
  balance: string | null;
  isPossibleDuplicate: boolean;
}

interface ClientsTableProps {
  rows: readonly ClientRow[];
  showOwner: boolean;
  showOpportunities: boolean;
  showBalance: boolean;
}

const STATUSES = ["Όλοι", "Υποψήφιος", "Ενεργός", "Ανενεργός"] as const;

export function ClientsTable({
  rows,
  showOwner,
  showOpportunities,
  showBalance,
}: ClientsTableProps) {
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<(typeof STATUSES)[number]>("Όλοι");

  const visible = rows.filter(
    (row) =>
      (status === "Όλοι" || row.status === status) &&
      row.name.toLowerCase().includes(query.trim().toLowerCase()),
  );

  return (
    <>
      <div className="toolbar">
        <input
          className="input grow"
          type="search"
          placeholder="Αναζήτηση πελάτη…"
          aria-label="Αναζήτηση πελάτη"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
        />
        <select
          className="select"
          aria-label="Κατάσταση Πελάτη"
          value={status}
          onChange={(event) =>
            setStatus(event.target.value as (typeof STATUSES)[number])
          }
        >
          {STATUSES.map((item) => (
            <option key={item}>{item}</option>
          ))}
        </select>
      </div>
      {visible.length === 0 ? (
        <p className="muted">Κανένας Πελάτης δεν ταιριάζει με την αναζήτηση.</p>
      ) : (
        <div className="scroll">
          <table className="rtable">
            <thead>
              <tr>
                <th>Πελάτης</th>
                <th>Κατάσταση</th>
                {showOwner && <th>Υπεύθυνος</th>}
                {showOpportunities && (
                  <th className="num">Ανοιχτές Ευκαιρίες</th>
                )}
                <th className="num">Ενεργές Συμφωνίες</th>
                {showBalance && <th className="num">Υπόλοιπο</th>}
              </tr>
            </thead>
            <tbody>
              {visible.map((row) => (
                <tr key={row.id}>
                  <td data-label="Πελάτης">
                    <Link href={row.href}>{row.name}</Link>{" "}
                    <span className="muted">{row.city}</span>{" "}
                    {row.isPossibleDuplicate && (
                      <Badge tone="attention">Πιθανό διπλό</Badge>
                    )}
                  </td>
                  <td data-label="Κατάσταση">{row.status}</td>
                  {showOwner && <td data-label="Υπεύθυνος">{row.owner}</td>}
                  {showOpportunities && (
                    <td className="num" data-label="Ανοιχτές Ευκαιρίες">
                      {row.openOpportunities}
                    </td>
                  )}
                  <td className="num" data-label="Ενεργές Συμφωνίες">
                    {row.activeAgreements}
                  </td>
                  {showBalance && (
                    <td className="num" data-label="Υπόλοιπο">
                      {row.balance}
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
