import { Panel } from "@/components/ui/panel";

import { formatMoney } from "../billables-helpers";
import { coverageOf, coverageText } from "../invoices-model";
import type { OpenBillable } from "../invoices-view-schema";
import { formatReceiptDate } from "../money";

interface InvoiceCoverageProps {
  open: readonly OpenBillable[];
  net: number;
  isCredit: boolean;
  toInvoice: number;
}

// «Προς τιμολόγηση του Πελάτη»: τι καλύπτει το καθαρό της φόρμας, από το παλαιότερο. Τα πιστωτικά δεν ξανανοίγουν τίποτα.
export function InvoiceCoverage({
  open,
  net,
  isCredit,
  toInvoice,
}: InvoiceCoverageProps) {
  const { rows, beyond } = coverageOf(open, isCredit ? 0 : net);
  return (
    <Panel label={`Προς τιμολόγηση του Πελάτη: ${formatMoney(toInvoice)}`}>
      <div className="grid gap-3">
        {open.length === 0 && (
          <p className="m-0 text-sm text-muted-foreground">
            Κανένα ανοιχτό Τιμολογητέο.
          </p>
        )}
        <ul className="m-0 grid list-none gap-2 p-0 text-sm">
          {rows.map((row) => (
            <li key={row.billable.id}>
              {formatReceiptDate(row.billable.billableOn)} ·{" "}
              {row.billable.label} · {formatMoney(row.billable.open)}
              <span className="block text-xs text-muted-foreground">
                {coverageText(row)}
              </span>
            </li>
          ))}
        </ul>
        {isCredit ? (
          <p className="m-0 text-sm text-muted-foreground">
            Τα πιστωτικά δεν ξανανοίγουν Τιμολογητέα.
          </p>
        ) : (
          beyond > 0 && (
            <p className="m-0 text-sm text-muted-foreground">
              Θα τιμολογηθεί πέρα από τα Τιμολογητέα κατά {formatMoney(beyond)}.
            </p>
          )
        )}
      </div>
    </Panel>
  );
}
