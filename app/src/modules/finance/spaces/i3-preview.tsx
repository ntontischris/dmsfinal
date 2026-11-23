import { fmtDate, fmtMoney } from "@/spaces/screens/shared";

import { coverageOf, coverageText, type Warning } from "../invoices-model";
import type { OpenBillable } from "../invoices-view-schema";
import { Fold } from "./i3-parts";

export function WarningsList({ warnings }: { warnings: readonly Warning[] }) {
  if (warnings.length === 0) return null;
  return (
    <ul className="i13-warn" aria-label="Προειδοποιήσεις">
      {warnings.map((w) => (
        <li key={w.text} data-strong={w.isStrong}>
          {w.isStrong ? "Προσοχή: " : "Προειδοποίηση: "}
          {w.text}
        </li>
      ))}
    </ul>
  );
}

interface PreviewProps {
  open: readonly OpenBillable[];
  net: number;
  isCredit: boolean;
  toInvoice: number;
}

const hintOf = (open: number, toInvoice: number): string =>
  `Προς τιμολόγηση του Πελάτη: ${fmtMoney(toInvoice)} · ${open === 0 ? "κανένα ανοιχτό" : `${open} ανοιχτά Τιμολογητέα`}`;

// Η κάλυψη των Τιμολογητέων (κλειστό κουτί), από το υπόδειγμα της βάσης: ποιο Τιμολογητέο κλείνει το καθαρό.
export function CoveragePreview({ open, net, isCredit, toInvoice }: PreviewProps) {
  const { rows, beyond } = coverageOf(open, isCredit ? 0 : net);
  return (
    <Fold title="Τι καλύπτει" hint={hintOf(open.length, toInvoice)}>
      {open.length === 0 && <p className="muted">Κανένα ανοιχτό Τιμολογητέο.</p>}
      {rows.length > 0 && (
        <ul className="ml-list i3-cover">
          {rows.map((row) => (
            <li key={row.billable.id} className="ml-line">
              <span className="ml-thumb i3-day">{fmtDate(row.billable.billableOn).slice(0, 5)}</span>
              <span className="ml-main">
                <span className="ml-tag">{coverageText(row)}</span>
                <strong>{row.billable.label}</strong>
                <small>{fmtDate(row.billable.billableOn)}</small>
              </span>
              <span className="ml-amount">{fmtMoney(row.billable.open)}</span>
            </li>
          ))}
        </ul>
      )}
      {isCredit ? (
        <p className="note">Τα πιστωτικά δεν ξανανοίγουν Τιμολογητέα.</p>
      ) : (
        beyond > 0 && <p className="note">Θα τιμολογηθεί πέρα από τα Τιμολογητέα κατά {fmtMoney(beyond)}.</p>
      )}
    </Fold>
  );
}
