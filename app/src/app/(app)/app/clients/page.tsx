import Link from "next/link";

import { lookOf } from "@/components/shell/read-look";
import { ScreenHeader } from "@/components/shell/screen-header";
import { buttonVariants } from "@/components/ui/button";
import { Notice } from "@/components/ui/notice";
import { AccessNotice, getViewer, type Viewer } from "@/modules/access";
import {
  ClientsSearch,
  ClientsTable,
  NewOpportunity,
  SpacesClients,
  listClients,
  listSalesLists,
  salesCaps,
  toPickerClient,
  type ClientRow,
  type ReadResult,
  type SalesCaps,
  type SalesLists,
} from "@/modules/sales";

export const metadata = { title: "Πελάτες" };

const EYEBROW = "B1 · Πελάτες και Πωλήσεις";

function LoadError({ title }: { title: string }) {
  return (
    <Notice kind="error" title={title}>
      <p className="m-0">Τίποτα δεν χάθηκε. Δοκίμασε ξανά σε λίγο.</p>
    </Notice>
  );
}

function NoAccess({ viewer }: { viewer: Viewer }) {
  return (
    <>
      <ScreenHeader eyebrow={EYEBROW} title="Πελάτες" />
      <AccessNotice viewer={viewer}>
        <p className="m-0">
          Τους Πελάτες τους βλέπει όποιος «Βλέπει Πελάτες» ή «Διαχειρίζεται
          Πελάτες και Ευκαιρίες».
        </p>
      </AccessNotice>
    </>
  );
}

// Οι Πηγές χρειάζονται μόνο στη φόρμα της νέας Ευκαιρίας· αν δεν φορτώσουν το λέμε, δεν κρύβουμε σιωπηλά το κουμπί.
function NewOpportunitySlot({
  clients,
  lists,
  caps,
}: {
  clients: readonly ClientRow[];
  lists: ReadResult<SalesLists> | null;
  caps: SalesCaps;
}) {
  if (lists === null) return null;
  if (!lists.ok) return <LoadError title="Δεν φόρτωσαν οι Πηγές" />;
  return (
    <NewOpportunity
      clients={clients
        .filter((row) => caps.manageScope === "all" || row.managerId !== null)
        .map((row) => toPickerClient(row, caps))}
      sources={lists.data.sources}
    />
  );
}

function ClientsBody({
  clients,
  query,
  caps,
}: {
  clients: readonly ClientRow[];
  query: string;
  caps: SalesCaps;
}) {
  if (clients.length === 0 && query !== "")
    return (
      <Notice kind="empty" title="Κανένας Πελάτης δεν ταιριάζει">
        <p className="m-0">Δοκίμασε άλλη λέξη ή καθάρισε την αναζήτηση.</p>
      </Notice>
    );
  return <ClientsTable rows={clients} caps={caps} />;
}

function SettingsLink() {
  return (
    <Link
      href="/app/settings/sales"
      className={buttonVariants({ variant: "ghost" })}
    >
      ⚙ Ρυθμίσεις
    </Link>
  );
}

// B1: όλοι οι Πελάτες φαίνονται με όνομα και Υπεύθυνο· ανοίγουν μόνο όσοι αφορούν τον θεατή (αποφασίζει η βάση).
// Στη νέα εμφάνιση (Χώροι) η οθόνη του prototype· αλλιώς η σημερινή.
export default async function ClientsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; new?: string; deleted?: string }>;
}) {
  const viewer = await getViewer();
  const { q, new: newStamp, deleted } = await searchParams;
  const query = typeof q === "string" ? q.trim() : "";
  if ((await lookOf(viewer)) === "spaces")
    return (
      <SpacesClients
        query={query}
        newStamp={typeof newStamp === "string" ? newStamp : undefined}
        isDeleted={deleted === "1"}
      />
    );
  const caps = salesCaps(viewer);
  if (!caps.canViewClients) return <NoAccess viewer={viewer} />;

  const [clients, lists] = await Promise.all([
    listClients({ query }),
    caps.canManage ? listSalesLists() : null,
  ]);

  return (
    <>
      <ScreenHeader eyebrow={EYEBROW} title="Πελάτες">
        {caps.canManageSettings && <SettingsLink />}
      </ScreenHeader>
      {!clients.ok ? (
        <LoadError title="Δεν φόρτωσαν οι Πελάτες" />
      ) : (
        <div className="grid gap-4">
          <NewOpportunitySlot
            clients={clients.data}
            lists={lists}
            caps={caps}
          />
          <ClientsSearch query={query} />
          <ClientsBody clients={clients.data} query={query} caps={caps} />
        </div>
      )}
    </>
  );
}
