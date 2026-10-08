import Link from "next/link";

import { ScreenHeader } from "@/components/shell/screen-header";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Notice } from "@/components/ui/notice";
import { Panel } from "@/components/ui/panel";
import { Tabs } from "@/components/ui/segmented";
import { AccessNotice, type Viewer } from "@/modules/access";
import {
  AccessRequestForm,
  ActivityList,
  ClientOpportunities,
  NewOpportunity,
  athensToday,
  getActivityLookups,
  listClientActivities,
  listClientOpportunities,
  listSalesLists,
  takenMessage,
  toPickerClient,
  type ClientAccess,
  type ClientDetail,
  type ClientRow,
  type SalesCaps,
} from "@/modules/sales";

export const EYEBROW = "B2 · Πελάτες και Πωλήσεις";
const TAB_IDS = ["details", "opportunities", "activities"] as const;
export type TabId = (typeof TAB_IDS)[number];

const TAB_LABELS: Readonly<Record<TabId, string>> = {
  details: "Στοιχεία",
  opportunities: "Ευκαιρίες",
  activities: "Δραστηριότητες",
};

const BackLink = () => (
  <Link href="/app/clients" className={buttonVariants({ variant: "ghost" })}>
    ← Πελάτες
  </Link>
);

export const LoadError = () => (
  <Notice kind="error" title="Δεν φόρτωσε ο Πελάτης">
    <p className="m-0">Τίποτα δεν χάθηκε. Δοκίμασε ξανά σε λίγο.</p>
  </Notice>
);

export function NoAccess({ viewer }: { viewer: Viewer }) {
  return (
    <>
      <ScreenHeader eyebrow={EYEBROW} title="Πελάτης" />
      <AccessNotice viewer={viewer}>
        <p className="m-0">
          Τους Πελάτες τους βλέπει όποιος «Βλέπει Πελάτες» ή «Διαχειρίζεται
          Πελάτες και Ευκαιρίες».
        </p>
      </AccessNotice>
    </>
  );
}

export function LoadFailed() {
  return (
    <>
      <ScreenHeader eyebrow={EYEBROW} title="Πελάτης" />
      <LoadError />
    </>
  );
}

export function Missing() {
  return (
    <>
      <ScreenHeader eyebrow={EYEBROW} title="Πελάτης" />
      <Notice kind="empty" title="Αυτός ο Πελάτης δεν υπάρχει">
        <BackLink />
      </Notice>
    </>
  );
}

// Η σελίδα ενός Πελάτη που ανήκει σε άλλον: φαίνεται η ύπαρξή του, όχι τα στοιχεία (ADR 0007).
export async function TakenClient({
  card,
  caps,
}: {
  card: ClientRow;
  caps: SalesCaps;
}) {
  const lists = caps.canManage ? await listSalesLists() : null;
  return (
    <>
      <ScreenHeader eyebrow={EYEBROW} title={card.name}>
        <Badge>Κατειλημμένος</Badge>
      </ScreenHeader>
      <Notice kind="empty" title="Ο Πελάτης ανήκει σε άλλον πωλητή">
        <p className="m-0">{takenMessage(card.managerName)}</p>
        {lists?.ok && (
          <AccessRequestForm
            clientId={card.id}
            managerName={card.managerName}
            sources={lists.data.sources}
          />
        )}
        <BackLink />
      </Notice>
    </>
  );
}

export function Merged({ client }: { client: ClientDetail }) {
  return (
    <>
      <ScreenHeader eyebrow={EYEBROW} title={client.name} />
      <Notice kind="empty" title="Αυτός ο Πελάτης συγχωνεύτηκε σε άλλον">
        {client.mergedIntoId && (
          <Link
            href={`/app/clients/${client.mergedIntoId}`}
            className={buttonVariants({ variant: "primary" })}
          >
            Άνοιγμα του ενιαίου Πελάτη
          </Link>
        )}
        <BackLink />
      </Notice>
    </>
  );
}

export const resolveTab = (
  value: string | undefined,
  access: ClientAccess,
): TabId => {
  const tab = TAB_IDS.find((id) => id === value) ?? "details";
  return access === "granted" && tab === "activities" ? "details" : tab;
};

export function ClientTabs({
  clientId,
  current,
  access,
}: {
  clientId: string;
  current: TabId;
  access: ClientAccess;
}) {
  const ids = TAB_IDS.filter(
    (id) => access !== "granted" || id !== "activities",
  );
  return (
    <Tabs
      label="Καρτέλες Πελάτη"
      options={ids.map((id) => ({
        label: TAB_LABELS[id],
        href: `/app/clients/${clientId}?tab=${id}`,
        isCurrent: id === current,
      }))}
    />
  );
}

function DetailsTab({
  card,
  caps,
}: {
  card: ClientRow | null;
  caps: SalesCaps;
}) {
  if (card?.isPossibleDuplicate && caps.canMerge)
    return (
      <Notice
        kind="empty"
        title="Πιθανό διπλό: δες την εκκρεμότητα στα Πιθανά διπλά"
      >
        <Link
          href="/app/clients/duplicates"
          className={buttonVariants({ variant: "primary" })}
        >
          Πιθανά διπλά
        </Link>
      </Notice>
    );
  return (
    <p className="m-0 text-sm text-muted-foreground">
      Η ταυτότητα του Πελάτη είναι στην πλαϊνή στήλη. Οι Ευκαιρίες και το
      ιστορικό είναι στις καρτέλες.
    </p>
  );
}

interface TabProps {
  client: ClientDetail;
  card: ClientRow | null;
  caps: SalesCaps;
  canEdit: boolean;
}

async function OpportunitiesTab({ client, card, caps, canEdit }: TabProps) {
  const [opportunities, lists] = await Promise.all([
    listClientOpportunities(client.id),
    listSalesLists(),
  ]);
  if (!opportunities.ok || !lists.ok) return <LoadError />;
  return (
    <Panel label="Ευκαιρίες">
      <div className="grid gap-4">
        {canEdit && card && (
          <NewOpportunity
            clients={[toPickerClient(card, caps)]}
            sources={lists.data.sources}
            preselectedClientId={client.id}
          />
        )}
        <ClientOpportunities
          opportunities={opportunities.data}
          lists={lists.data}
          today={athensToday()}
          canOpen={caps.canManage}
        />
      </div>
    </Panel>
  );
}

async function ActivitiesTab({ client }: { client: ClientDetail }) {
  const [activities, lookups] = await Promise.all([
    listClientActivities(client.id),
    getActivityLookups(),
  ]);
  if (!activities.ok || !lookups.ok) return <LoadError />;
  return (
    <Panel label="Δραστηριότητες">
      <ActivityList
        items={activities.data}
        lookups={lookups.data}
        showOpportunity
      />
    </Panel>
  );
}

export async function GrantedNote({
  client,
  caps,
}: {
  client: ClientDetail;
  caps: SalesCaps;
}) {
  const opportunities = await listClientOpportunities(client.id);
  const mine = opportunities.ok
    ? opportunities.data.find((o) => o.managerId === caps.userId)
    : undefined;
  if (!mine) return null;
  return (
    <p className="m-0 text-sm text-muted-foreground">
      Πρόσβαση μέσω της Ευκαιρίας σου «{mine.title}» · Υπεύθυνος Πελάτη:{" "}
      {client.managerName ?? "—"}
    </p>
  );
}

export function TabContent({ tab, ...props }: TabProps & { tab: TabId }) {
  if (tab === "opportunities") return <OpportunitiesTab {...props} />;
  if (tab === "activities") return <ActivitiesTab client={props.client} />;
  return <DetailsTab card={props.card} caps={props.caps} />;
}
