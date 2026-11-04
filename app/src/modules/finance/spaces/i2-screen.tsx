import Link from "next/link";

import { can, getViewer, type Viewer } from "@/modules/access";
import { getSpaceStrip } from "@/modules/today";
import { FilterPanel, type FilterGroup } from "@/spaces/kit/filter-panel";
import { hrefOf } from "@/spaces/data/screens";
import { codesOfSpace } from "@/spaces/data/spaces";
import { ErrorNotice, StateNotice, fmtMoney } from "@/spaces/screens/shared";
import { Strip } from "@/spaces/shell/strip";

import { financeCaps } from "../caps";
import { FILTER_LABELS } from "../invoices-labels";
import { getInvoices, getVoidedInvoices } from "../invoices-queries";
import {
  INVOICE_FILTERS,
  type InvoiceFilter,
  type InvoiceItem,
  type InvoicesView,
} from "../invoices-view-schema";
import { athensToday } from "../money";
import { listReceipts } from "../queries";
import type { ReceiptRow } from "../types";
import { CsvButton } from "./i2-csv";
import {
  byClient,
  byMonth,
  clientsWithInvoices,
  fmtMonth,
  invoiceMonthsOf,
  monthName,
  previousMonthOf,
  receiptsIn,
  unpaidNoteOf,
  versus,
  visibleInvoices,
} from "./i2-model";
import { InvoiceTable } from "./i2-table";
import { VoidedCard } from "./i2-voided";

import "./i245.css";
import "./i2.css";

export interface SpacesInvoicesQuery {
  filter: InvoiceFilter;
  client?: string;
  month?: string;
}

const i2Href = (query: Partial<SpacesInvoicesQuery>): string =>
  hrefOf("I2", {
    filter: query.filter === "all" ? undefined : query.filter,
    client: query.client,
    month: query.month,
  });

interface TotalsProps {
  totals: InvoicesView["totals"];
  receipts: readonly ReceiptRow[] | null;
  today: string;
  viewer: Viewer;
}

// Η κορυφή των Χρημάτων: πόσα μπήκαν (με σύγκριση), πόσα τιμολογήθηκαν, πόσα μας χρωστούν, και το Τώρα του Χώρου.
async function Totals({ totals, receipts, today, viewer }: TotalsProps) {
  const strip = await getSpaceStrip(codesOfSpace("money"));
  const month = today.slice(0, 7);
  const previous = previousMonthOf(month);
  const hasReports = can(viewer, "reports.view");
  const turnover = hasReports
    ? hrefOf("M1", { report: "turnover", period: "this-month" })
    : undefined;
  const received =
    receipts === null
      ? []
      : [
          {
            label: `Μπήκαν τον ${monthName(month)} (με ΦΠΑ)`,
            value: fmtMoney(receiptsIn(receipts, month)),
            hint: `${versus(receiptsIn(receipts, month), receiptsIn(receipts, previous))} τον ${monthName(previous)}: ${fmtMoney(receiptsIn(receipts, previous))} `,
            href: turnover,
          },
        ];
  return (
    <Strip
      now={strip.now}
      stats={[
        ...received,
        {
          label: `Τιμολογήθηκαν τον ${monthName(month)} (χωρίς ΦΠΑ)`,
          value: fmtMoney(totals.turnoverMonth),
          hint: "καθαρά ποσά, όπως μετρά ο τζίρος",
          href: turnover,
        },
        {
          label: "Μας χρωστούν από Τιμολόγια (με ΦΠΑ)",
          value: fmtMoney(totals.unpaid),
          hint: `από αυτά ληξιπρόθεσμα ${fmtMoney(totals.overdue)} · δες ανά ηλικία`,
          tone: totals.overdue > 0 ? "attention" : undefined,
          href: hasReports
            ? hrefOf("M1", { report: "receivables" })
            : undefined,
        },
      ]}
    />
  );
}

// Κατάσταση Τιμολογίων με αριθμούς (μέσα στον τρέχοντα Πελάτη και μήνα).
export const statusGroupOf = (
  query: SpacesInvoicesQuery,
  all: readonly InvoiceItem[],
): FilterGroup => ({
  label: "Κατάσταση",
  options: INVOICE_FILTERS.map((f) => ({
    label: FILTER_LABELS[f],
    isCurrent: f === query.filter,
    count: visibleInvoices(all, f).length,
    href: i2Href({ ...query, filter: f }),
  })),
});

// Φίλτρο Πελάτη: μόνο όσοι Πελάτες έχουν Τιμολόγια.
const clientGroupOf = (
  query: SpacesInvoicesQuery,
  items: readonly InvoiceItem[],
): FilterGroup => ({
  label: "Πελάτης",
  isSearchable: true,
  all: {
    label: "όλοι",
    href: i2Href({ ...query, client: undefined }),
    isCurrent: !query.client,
  },
  options: clientsWithInvoices(items).map((c) => ({
    label: c.name,
    href: i2Href({ ...query, client: c.id }),
    isCurrent: query.client === c.id,
  })),
});

// Φίλτρο μήνα έκδοσης: μόνο οι μήνες που έχουν Τιμολόγια.
export const monthGroupOf = (
  query: SpacesInvoicesQuery,
  months: readonly string[],
): FilterGroup => ({
  label: "Μήνας έκδοσης",
  all: {
    label: "όλοι",
    href: i2Href({ ...query, month: undefined }),
    isCurrent: !query.month,
  },
  options: months.map((m) => ({
    label: fmtMonth(m),
    href: i2Href({ ...query, month: m }),
    isCurrent: query.month === m,
  })),
});

// Χωρίς Πελάτη και μήνα, στην ίδια Κατάσταση.
export const i2ClearHref = (query: SpacesInvoicesQuery): string =>
  i2Href({ filter: query.filter });

const denied = (
  <div data-spaces>
    <StateNotice kind="denied" title="Χωρίς δικαίωμα">
      Τα Τιμολόγια τα βλέπουν μόνο όσοι βλέπουν Οικονομικά και ποσά.
    </StateNotice>
  </div>
);

// I2 Τιμολόγια στη νέα εμφάνιση (prototype `screens/I2.tsx`) για την ομάδα: όλα τα Τιμολόγια από μία ανάγνωση
// (invoices_view), φίλτρα κατάστασης, Πελάτη και μήνα στη διεύθυνση, Εισπράξεις του μήνα για τη λωρίδα.
export async function SpacesInvoices({
  query,
}: {
  query: SpacesInvoicesQuery;
}) {
  const viewer = await getViewer();
  const caps = financeCaps(viewer);
  if (!caps.canView) return denied;
  const [invoices, voided, receipts] = await Promise.all([
    getInvoices("all"),
    query.filter === "all" ? getVoidedInvoices() : null,
    listReceipts(null),
  ]);
  if (!invoices.ok)
    return (
      <div data-spaces>
        <ErrorNotice what="τα Τιμολόγια" />
      </div>
    );
  const today = athensToday();
  const listed = invoices.data.items;
  const clientId = listed.some((row) => row.clientId === query.client)
    ? query.client
    : undefined;
  const months = invoiceMonthsOf(listed);
  const month = months.find((m) => m === query.month);
  const current: SpacesInvoicesQuery = {
    filter: query.filter,
    client: clientId,
    month,
  };
  const all = byMonth(byClient(listed, clientId), month);
  const rows = visibleInvoices(all, query.filter);
  const unpaidNote = query.filter === "unpaid" ? unpaidNoteOf(all) : null;
  return (
    <div data-spaces>
      <Totals
        totals={invoices.data.totals}
        receipts={receipts.ok ? receipts.data : null}
        today={today}
        viewer={viewer}
      />
      <FilterPanel
        name="i2-filters"
        status={statusGroupOf(current, all)}
        filters={[
          clientGroupOf(current, listed),
          ...(months.length > 1 ? [monthGroupOf(current, months)] : []),
        ]}
        clearHref={i2ClearHref(current)}
      >
        {unpaidNote && <p className="note">{unpaidNote}</p>}
        <div className="toolbar">
          {caps.canRegisterInvoices && (
            <Link className="button" data-primary="true" href={hrefOf("I3")}>
              Καταχώρηση Τιμολογίου
            </Link>
          )}
          <CsvButton rows={rows} />
        </div>
        {rows.length === 0 ? (
          <StateNotice kind="empty" title="Κανένα Τιμολόγιο">
            Δεν υπάρχει Τιμολόγιο για αυτό το φίλτρο.
          </StateNotice>
        ) : (
          <InvoiceTable
            rows={rows}
            today={today}
            canEdit={caps.canRegisterInvoices}
          />
        )}
      </FilterPanel>
      {voided?.ok === true && (
        <VoidedCard
          items={voided.data}
          liveNumbers={new Set(listed.map((row) => row.number))}
        />
      )}
    </div>
  );
}
