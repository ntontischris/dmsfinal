import { ListRow, RowList } from "@/spaces/kit/parts";
import { Panel } from "@/spaces/kit/panel";
import { fmtDate, fmtMoney } from "@/spaces/screens/shared";

import { coverageOf, coverageText, type Warning } from "../invoices-model";
import type { OpenBillable } from "../invoices-view-schema";

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

// Η κάλυψη των Τιμολογητέων δεξιά (prototype `screens/i3-preview.tsx`), από το υπόδειγμα της βάσης.
export function CoveragePreview({ open, net, isCredit, toInvoice }: PreviewProps) {
  const { rows, beyond } = coverageOf(open, isCredit ? 0 : net);
  return (
    <Panel label={`Προς τιμολόγηση του Πελάτη: ${fmtMoney(toInvoice)}`}>
      {open.length === 0 && <p className="muted">Κανένα ανοιχτό Τιμολογητέο.</p>}
      <RowList>
        {rows.map((row) => (
          <ListRow
            key={row.billable.id}
            lead={<span className="i13-date">{fmtDate(row.billable.billableOn)}</span>}
            title={row.billable.label}
            sub={coverageText(row)}
            aside={<strong className="i13-money">{fmtMoney(row.billable.open)}</strong>}
          />
        ))}
      </RowList>
      {isCredit ? (
        <p className="note">Τα πιστωτικά δεν ξανανοίγουν Τιμολογητέα.</p>
      ) : (
        beyond > 0 && (
          <p className="note">Θα τιμολογηθεί πέρα από τα Τιμολογητέα κατά {fmtMoney(beyond)}.</p>
        )
      )}
    </Panel>
  );
}
