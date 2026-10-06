import {
  previewOf,
  type BillableLite,
  type PreviewRow,
  type Warning,
} from "@/screens/i3-model";
import { fmtDate, fmtMoney } from "@/screens/shared";

import "./i13.css";

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

const coverText = (row: PreviewRow): string => {
  if (row.covered === 0) return "μένει ανοιχτό";
  if (row.left === 0) return "καλύπτεται πλήρως";
  return `καλύπτεται ${fmtMoney(row.covered)}, μένει ${fmtMoney(row.left)}`;
};

interface PreviewProps {
  open: readonly BillableLite[];
  net: number;
  isCredit: boolean;
  toInvoice: number;
}

export function CoveragePreview({
  open,
  net,
  isCredit,
  toInvoice,
}: PreviewProps) {
  const { rows, left } = previewOf(open, isCredit ? 0 : net);
  return (
    <section className="card">
      <h2>Προς τιμολόγηση του Πελάτη: {fmtMoney(toInvoice)}</h2>
      {open.length === 0 && (
        <p className="muted">Κανένα ανοιχτό Τιμολογητέο.</p>
      )}
      <ul className="list">
        {rows.map((row) => (
          <li key={row.billable.id} className="i13-wrap">
            {fmtDate(row.billable.date)} · {row.billable.label} ·{" "}
            {fmtMoney(row.billable.open)}
            <span className="i13-sub">{coverText(row)}</span>
          </li>
        ))}
      </ul>
      {isCredit ? (
        <p className="note">Τα πιστωτικά δεν ξανανοίγουν Τιμολογητέα.</p>
      ) : (
        left > 0 && (
          <p className="note">
            Θα τιμολογηθεί πέρα από τα Τιμολογητέα κατά {fmtMoney(left)}.
          </p>
        )
      )}
    </section>
  );
}
