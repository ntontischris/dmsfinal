import { formatMoney } from "../helpers";
import type { BillablesView } from "../view-schema";

interface ToInvoiceTotalsProps {
  view: BillablesView;
}

// Η γραμμή συνόλων: σύνολο προς τιμολόγηση, πλήθος Τιμολογητέων και Πελατών.
export function ToInvoiceTotals({ view }: ToInvoiceTotalsProps) {
  const clientCount = view.clients.length;
  return (
    <p className="m-0 flex flex-wrap gap-x-4 gap-y-1 text-sm">
      <span className="font-semibold tabular-nums">
        Σύνολο προς τιμολόγηση: {formatMoney(view.total)}
      </span>
      <span className="text-muted-foreground">
        {view.count} {view.count === 1 ? "Τιμολογητέο" : "Τιμολογητέα"}
      </span>
      <span className="text-muted-foreground">
        {clientCount} {clientCount === 1 ? "Πελάτης" : "Πελάτες"}
      </span>
    </p>
  );
}
