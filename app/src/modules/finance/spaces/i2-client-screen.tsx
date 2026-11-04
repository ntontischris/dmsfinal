import { getViewer } from "@/modules/access";
import { FilterBar } from "@/spaces/kit/filter-bar";
import { ErrorNotice, StateNotice } from "@/spaces/screens/shared";

import { financeViewOf } from "../caps";
import {
  CLIENT_INVOICES_EMPTY_TEXT,
  CLIENT_INVOICES_NO_ACCESS_TEXT,
} from "../ledger-labels";
import { getClientInvoices } from "../ledger-queries";
import { athensToday } from "../money";
import { clientInvoiceRowOf } from "./i2-client-adapter";
import {
  byMonth,
  invoiceMonthsOf,
  unpaidNoteOf,
  visibleInvoices,
} from "./i2-model";
import {
  i2ClearHref,
  monthGroupOf,
  statusGroupOf,
  type SpacesInvoicesQuery,
} from "./i2-screen";
import { InvoiceTable } from "./i2-table";

import "./i245.css";
import "./i2.css";

// I2 Τιμολόγια του Χρήστη πελάτη στη νέα εμφάνιση (prototype `screens/I2.tsx`, caps.isClient): μόνο τα δικά του,
// από την ίδια ανάγνωση με την παλιά (client_invoices_view). Χωρίς σύνολα, στήλη Πελάτη, Πελάτη-φίλτρο, Ίχνος ή ακυρωμένα.
export async function SpacesClientInvoices({
  query,
}: {
  query: Omit<SpacesInvoicesQuery, "client">;
}) {
  const viewer = await getViewer();
  if (financeViewOf(viewer) !== "client")
    return (
      <div data-spaces>
        <StateNotice kind="denied" title="Χωρίς δικαίωμα">
          {CLIENT_INVOICES_NO_ACCESS_TEXT}
        </StateNotice>
      </div>
    );
  const invoices = await getClientInvoices();
  if (!invoices.ok)
    return (
      <div data-spaces>
        <ErrorNotice what="τα Τιμολόγια" />
      </div>
    );
  const listed = invoices.data.items.map(clientInvoiceRowOf);
  const months = invoiceMonthsOf(listed);
  const month = months.find((m) => m === query.month);
  const current: SpacesInvoicesQuery = { filter: query.filter, month };
  const all = byMonth(listed, month);
  const rows = visibleInvoices(all, query.filter);
  const unpaidNote = query.filter === "unpaid" ? unpaidNoteOf(all) : null;
  return (
    <div data-spaces>
      <FilterBar
        name="i2-filters"
        filters={[
          statusGroupOf(current, all),
          ...(months.length > 1 ? [monthGroupOf(current, months)] : []),
        ]}
        clearHref={i2ClearHref(current)}
      />
        {unpaidNote && <p className="note">{unpaidNote}</p>}
        {rows.length === 0 ? (
          <StateNotice kind="empty" title="Κανένα Τιμολόγιο">
            {listed.length === 0
              ? CLIENT_INVOICES_EMPTY_TEXT
              : "Δεν υπάρχει Τιμολόγιο για αυτό το φίλτρο."}
          </StateNotice>
        ) : (
          <InvoiceTable
            rows={rows}
            today={athensToday()}
            canEdit={false}
            showClient={false}
          />
        )}
    </div>
  );
}
