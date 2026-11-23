import { getViewer } from "@/modules/access";
import { getSpaceStrip } from "@/modules/today";
import {
  columnFilterGroups,
  filterByColumns,
} from "@/spaces/kit/column-filters";
import { Pager } from "@/spaces/kit/pager";
import { pageOf } from "@/spaces/kit/pager-model";
import { codesOfSpace } from "@/spaces/data/spaces";
import { ErrorNotice, StateNotice } from "@/spaces/screens/shared";

import { athensToday, salesCaps, toPickerClient } from "../helpers";
import { listSalesLists } from "../queries-lists";
import type { ClientRow, SalesCaps } from "../types";
import { b1ColumnsOf, b1RowsOf, type B1Row } from "./b1-adapter";
import { ClientsSearch, ClientsTable } from "./b1-clients-table";
import { b1ColumnFilters } from "./b1-columns";
import { B1FiltersBox } from "./b1-filters-box";
import {
  applyB1Filters,
  b1FilterGroups,
  b1Href,
  type B1Filters,
} from "./b1-filters";
import { NewOpportunity } from "./b1-new-opportunity";
import { B1Top } from "./b1-top";
import { listClientsOnce, listOverviewsOnce } from "./clients-once";
import { GuideLink } from "./guide-link";

import "../../finance/spaces/money-lines.css";
import "./b1.css";
import "./b1-lines.css";

interface SpacesClientsProps {
  query: string;
  // Τα φίλτρα της διεύθυνσης (?status=, ?noshoot=1, ?package= και ένα ανά στήλη).
  filters: B1Filters;
  // Η σελίδα της λίστας (?page=), από 1.
  page?: number;
  // Το «+ Νέο → Νέα Ευκαιρία» βάζει νέα τιμή κάθε φορά, ώστε η φόρμα να ανοίγει και αν είσαι ήδη εδώ.
  newStamp: string | undefined;
  // Μόλις διαγράφηκε Πελάτης (η ενέργεια γυρίζει εδώ με ?deleted=1).
  isDeleted?: boolean;
}

// Ο πωλητής με «όσα με αφορούν» διαλέγει μόνο Πελάτες με Υπεύθυνο (οι υπόλοιποι πάνε από το «Χωρίς υπεύθυνο»).
const pickersOf = (clients: readonly ClientRow[], caps: SalesCaps) =>
  clients
    .filter((row) => caps.manageScope === "all" || row.managerId !== null)
    .map((row) => toPickerClient(row, caps));

async function NewOpportunitySlot({
  clients,
  caps,
  newStamp,
}: {
  clients: readonly ClientRow[];
  caps: SalesCaps;
  newStamp?: string;
}) {
  const lists = await listSalesLists();
  if (!lists.ok) return <ErrorNotice what="οι Πηγές της νέας Ευκαιρίας" />;
  return (
    <NewOpportunity
      key={newStamp ?? ""}
      clients={pickersOf(clients, caps)}
      sources={lists.data.sources}
      isOpenAtStart={newStamp !== undefined}
    />
  );
}

// Πόσοι Πελάτες ανά σελίδα.
const PAGE_SIZE = 50;

// Η σειρά φίλτρων και η σελίδα: τα παλιά φίλτρα (Κατάσταση, Γύρισμα, Πακέτο) και ένα ανά στήλη, όλα μαζί. Ο αριθμός
// κάθε επιλογής μετρά με τα υπόλοιπα φίλτρα όπως είναι.
function ClientsList({
  rows,
  query,
  filters,
  page,
  caps,
}: {
  rows: readonly B1Row[];
  query: string;
  filters: B1Filters;
  page: number;
  caps: SalesCaps;
}) {
  const shown = b1ColumnsOf(rows, caps);
  const columns = b1ColumnFilters(athensToday(), shown);
  const selection = filters.columns ?? {};
  const legacy = b1FilterGroups(
    filterByColumns(rows, columns, selection),
    query,
    filters,
  );
  const narrowed = applyB1Filters(rows, filters);
  const columnGroups = columnFilterGroups({
    rows: narrowed,
    columns,
    selection,
    hrefWith: (next) => b1Href(query, { ...filters, columns: next }),
  });
  const current = pageOf(
    filterByColumns(narrowed, columns, selection),
    page,
    PAGE_SIZE,
  );
  return (
    <>
      <div className="kit-fb b1-search">
        <ClientsSearch query={query} filters={filters} />
      </div>
      <B1FiltersBox
        filters={[...legacy.filters, ...columnGroups]}
        clearHref={legacy.clearHref}
      />
      <ClientsTable rows={current.items} filters={filters} {...shown} />
      <Pager page={current} hrefOf={(n) => b1Href(query, filters, n)} />
    </>
  );
}

// B1 Πελάτες στη νέα εμφάνιση (prototype `screens/B1.tsx`): όλοι οι Πελάτες με όνομα και Υπεύθυνο, και η εικόνα του καθενός
// (κατάσταση, πακέτο και μήνας, Συμφωνίες, Υπόλοιπο, τελευταία επαφή) από μία ανάγνωση. Ανοίγουν μόνο όσοι αφορούν τον Χρήστη.
export async function SpacesClients({
  query,
  filters,
  page = 1,
  newStamp,
  isDeleted = false,
}: SpacesClientsProps) {
  const caps = salesCaps(await getViewer());
  if (!caps.canViewClients)
    return (
      <div data-spaces>
        <StateNotice kind="denied" title="Χωρίς πρόσβαση στους Πελάτες">
          Τους Πελάτες τους βλέπει όποιος «Βλέπει Πελάτες» ή «Διαχειρίζεται
          Πελάτες και Ευκαιρίες».
        </StateNotice>
      </div>
    );
  const [clients, strip] = await Promise.all([
    listClientsOnce(query),
    getSpaceStrip(codesOfSpace("clients")),
  ]);
  if (!clients.ok)
    return (
      <div data-spaces>
        <ErrorNotice what="η λίστα Πελατών" />
      </div>
    );
  const overviews = await listOverviewsOnce(
    clients.data.filter((row) => row.canOpen).map((row) => row.id),
  );
  const rows = b1RowsOf(clients.data, overviews.ok ? overviews.data : [], caps);
  return (
    <div data-spaces>
      <p className="b1-what">
        Βρες έναν Πελάτη και άνοιξέ τον· ό,τι θέλει προσοχή έχει κόκκινη
        κουκκίδα.
      </p>
      <B1Top stats={strip.stats} now={strip.now} />
      {isDeleted && (
        <p className="note" role="status">
          Ο Πελάτης διαγράφηκε.
        </p>
      )}
      <div className="toolbar">
        <span className="muted grow">
          {caps.manageScope === "mine" &&
            "Ένας Πελάτης, ένας πωλητής: βλέπεις το όνομα των Πελατών των άλλων, αλλά ανοίγεις μόνο τους δικούς σου και όσους έχουν δική σου Ευκαιρία. "}
          {!caps.canManage && "Μόνο ανάγνωση. "}
        </span>
        <GuideLink />
        {caps.canManage && (
          <NewOpportunitySlot
            clients={clients.data}
            caps={caps}
            newStamp={newStamp}
          />
        )}
      </div>
      {!overviews.ok && (
        <ErrorNotice what="η εικόνα των Πελατών (κατάσταση, πακέτο, Υπόλοιπο)" />
      )}
      {clients.data.length === 0 && query === "" ? (
        <StateNotice kind="empty" title="Δεν υπάρχουν Πελάτες ακόμα">
          <p>
            {caps.canManage
              ? "Οι Πελάτες γεννιούνται από τη φόρμα της Ιστοσελίδας ή όταν τους καταχωρείς εσύ."
              : "Όταν καταχωρηθεί ο πρώτος Πελάτης, θα εμφανιστεί εδώ."}
          </p>
        </StateNotice>
      ) : (
        <ClientsList
          rows={rows}
          query={query}
          filters={filters}
          page={page}
          caps={caps}
        />
      )}
    </div>
  );
}
