import { StatGrid } from "@/components/ui/panel";

import { filterHref } from "../invoices-helpers";
import type { InvoicesView } from "../invoices-view-schema";
import { formatMoney } from "../billables-helpers";

interface InvoiceTotalsProps {
  totals: InvoicesView["totals"];
}

// Τα τρία σύνολα της I2: Τζίρος μήνα, Ανεξόφλητα και Ληξιπρόθεσμα (με σύνδεσμο στο φίλτρο τους).
export function InvoiceTotals({ totals }: InvoiceTotalsProps) {
  return (
    <StatGrid
      items={[
        { label: "Τζίρος μήνα", value: formatMoney(totals.turnoverMonth) },
        {
          label: "Ανεξόφλητα",
          value: formatMoney(totals.unpaid),
          hint: `${totals.unpaidCount} Τιμολόγια`,
          href: filterHref("unpaid"),
        },
        {
          label: "Ληξιπρόθεσμα",
          value: formatMoney(totals.overdue),
          hint: `${totals.overdueCount} Τιμολόγια`,
          tone: totals.overdue > 0 ? "attention" : undefined,
          href: filterHref("overdue"),
        },
      ]}
    />
  );
}
