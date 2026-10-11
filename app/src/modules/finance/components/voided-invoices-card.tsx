import { Panel } from "@/components/ui/panel";

import { formatMoney } from "../billables-helpers";
import { VOIDED_NOTE, VOIDED_TITLE } from "../invoice-corrections-labels";
import type { VoidedItem } from "../invoice-detail-schema";
import { KIND_LABELS } from "../invoices-labels";
import { athensToday, formatReceiptDate } from "../money";

interface VoidedInvoicesCardProps {
  items: readonly VoidedItem[];
}

// Η κάρτα «Ακυρωμένες καταχωρίσεις» του I2 (φίλτρο «όλα»): μόνο για την ομάδα, με λόγο και ποιος ακύρωσε.
export function VoidedInvoicesCard({ items }: VoidedInvoicesCardProps) {
  if (items.length === 0) return null;
  return (
    <Panel label={VOIDED_TITLE}>
      <p className="m-0 mb-3 text-sm text-muted-foreground">{VOIDED_NOTE}</p>
      <ul className="m-0 grid list-none gap-2 p-0 text-sm">
        {items.map((item) => (
          <li key={item.id}>
            <span className="font-medium">{item.number}</span> ·{" "}
            {KIND_LABELS[item.kind]} · {item.clientName} ·{" "}
            {formatMoney(item.total)} · έκδοση{" "}
            {formatReceiptDate(item.issueDate)}
            <span className="block text-xs text-muted-foreground">
              Λόγος: {item.reason} ({item.voidedBy ?? "—"},{" "}
              {formatReceiptDate(athensToday(new Date(item.voidedAt)))})
            </span>
          </li>
        ))}
      </ul>
    </Panel>
  );
}
