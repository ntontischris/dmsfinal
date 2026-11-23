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
import { ClientInvoicesHero } from "./i2-client-hero";
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
import "./money-lines.css";
import "./i5-lines.css";

// I2 Τιμολόγια του Χρήστη πελάτη (Χρήματα restyle): μόνο τα δικά του, από την ίδια ανάγνωση (client_invoices_view).
// Πάνω τι μένει να πληρώσει και «Πώς πληρώνω»· από κάτω τα φίλτρα και τα Τιμολόγια ως γραμμές με PDF. Χωρίς τα σύνολα
// της ομάδας, στήλη Πελάτη, Πελάτη-φίλτρο, Ίχνος ή ακυρωμένα.
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
      <div className="ml-head i5-head">
        <p>Τι μένει να πληρώσεις, με το PDF κάθε Τιμολογίου.</p>
      </div>
      <div className="i5-gap">
        <ClientInvoicesHero rows={listed} />
      </div>
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
