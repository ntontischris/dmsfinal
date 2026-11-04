import { getViewer } from "@/modules/access";
import { getSpaceStrip } from "@/modules/today";
import { FilterBar } from "@/spaces/kit/filter-bar";
import { codesOfSpace } from "@/spaces/data/spaces";
import { ErrorNotice, StateNotice } from "@/spaces/screens/shared";
import { Strip } from "@/spaces/shell/strip";

import { salesCaps, toPickerClient } from "../helpers";
import { listClients } from "../queries-clients";
import { listSalesLists } from "../queries-lists";
import { listClientOverviews } from "../queries-overview";
import type { ClientRow, SalesCaps } from "../types";
import { b1ColumnsOf, b1RowsOf } from "./b1-adapter";
import { ClientsSearch, ClientsTable } from "./b1-clients-table";
import { applyB1Filters, b1FilterGroups, type B1Filters } from "./b1-filters";
import { NewOpportunity } from "./b1-new-opportunity";

import "./b1.css";

interface SpacesClientsProps {
  query: string;
  // Τα φίλτρα της διεύθυνσης (?status=, ?noshoot=1, ?monthly=1).
  filters: B1Filters;
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

// B1 Πελάτες στη νέα εμφάνιση (prototype `screens/B1.tsx`): όλοι οι Πελάτες με όνομα και Υπεύθυνο, και η εικόνα του καθενός
// (κατάσταση, πακέτο και μήνας, Συμφωνίες, Υπόλοιπο, τελευταία επαφή) από μία ανάγνωση. Ανοίγουν μόνο όσοι αφορούν τον Χρήστη.
export async function SpacesClients({
  query,
  filters,
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
    listClients({ query }),
    getSpaceStrip(codesOfSpace("clients")),
  ]);
  if (!clients.ok)
    return (
      <div data-spaces>
        <ErrorNotice what="η λίστα Πελατών" />
      </div>
    );
  const overviews = await listClientOverviews(
    clients.data.filter((row) => row.canOpen).map((row) => row.id),
  );
  const rows = b1RowsOf(clients.data, overviews.ok ? overviews.data : [], caps);
  return (
    <div data-spaces>
      <Strip stats={strip.stats} now={strip.now} />
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
        <>
          <FilterBar
            name="b1-filters"
            {...b1FilterGroups(rows, query, filters)}
          >
            <ClientsSearch query={query} filters={filters} />
          </FilterBar>
          <ClientsTable
            rows={applyB1Filters(rows, filters)}
            filters={filters}
            {...b1ColumnsOf(rows, caps)}
          />
        </>
      )}
      {clients.data.length >= 100 && (
        <p className="muted">
          Εμφανίζονται οι πρώτοι 100. Στένεψε την αναζήτηση.
        </p>
      )}
    </div>
  );
}
