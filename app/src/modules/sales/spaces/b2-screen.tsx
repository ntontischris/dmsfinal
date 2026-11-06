import Link from "next/link";
import { z } from "zod";

import {
  SpacesClientUsers,
  can,
  getViewer,
  isOwner,
  type Viewer,
} from "@/modules/access";
import {
  agreementCaps,
  listAgreements,
  type AgreementRow,
} from "@/modules/agreements";
import { SpacesHistoryLink } from "@/modules/audit";
import { financeCaps, getLedger } from "@/modules/finance";
import { SpacesGdprClientSection } from "@/modules/gdpr";
import { messagesCaps } from "@/modules/messages";
import {
  SpacesClientSends,
  type ClientSendsFilter,
  canSeeClientSends,
  sendsCaps,
} from "@/modules/notifications";
import { productionsCaps } from "@/modules/productions";
import { hrefOf } from "@/spaces/data/screens";
import { Badge, ErrorNotice, StateNotice } from "@/spaces/screens/shared";
import { Strip } from "@/spaces/shell/strip";

import { athensToday, clientAccess, salesCaps, takenMessage } from "../helpers";
import {
  getClient,
  getClientCard,
  getClientDeleteState,
  listClientOpportunities,
} from "../queries-clients";
import { listSalesLists } from "../queries-lists";
import { listClientOverviews } from "../queries-overview";
import { listAssignableUsers } from "../queries-queue";
import type {
  ClientDeleteState,
  ClientDetail,
  ClientRow,
  Opportunity,
  SalesCaps,
  SalesLists,
} from "../types";
import { AccessRequest } from "./access-request";
import { STATUS_LABELS } from "./b1-adapter";
import {
  B2_TABS,
  activeAgreementText,
  allowedTabs,
  clientStripStats,
  clientSummary,
  opportunityRows,
  relationshipSteps,
  resolveB2Tab,
  type B2Ledger,
  type B2Tab,
  type B2TabRights,
} from "./b2-adapter";
import { ClientDelete } from "./b2-delete";
import { ClientInspector, RelationshipSteps } from "./b2-inspector";
import { ActivitiesTab, ProductionsTab } from "./b2-tabs";
import {
  AgreementsSection,
  ChatSection,
  DetailsSection,
  LedgerSection,
  OpportunitiesSection,
} from "./b2-sections";

import { B2ProtoView } from "./b2-proto-view";
import { ProtoSwitcher } from "./b2-proto-switcher";
import {
  isProtoEnabled,
  parseVariant,
  type ProtoVariant,
} from "./b2-proto-model";

import "./b2.css";

interface SpacesClientProps {
  clientId: string;
  tab: string | undefined;
  // Τα φίλτρα της καρτέλας «Τι στάλθηκε».
  sendsFilter: ClientSendsFilter;
  // PROTOTYPE: ?variant=a|b|c (αγνοείται στην παραγωγή).
  variant?: string;
}

const Frame = ({ children }: { children: React.ReactNode }) => (
  <div data-spaces>{children}</div>
);

const BackToList = () => (
  <p>
    <Link href={hrefOf("B1")}>Πίσω στη λίστα Πελατών</Link>
  </p>
);

const rightsOf = (viewer: Viewer, client: ClientDetail): B2TabRights => ({
  details: true,
  users: can(viewer, "access.clientUsers"),
  opportunities: true,
  agreements: agreementCaps(viewer).canView,
  productions: productionsCaps(viewer).canView,
  chat: messagesCaps(viewer).canChat,
  activities: true,
  dispatches: canSeeClientSends(viewer, client.managerId),
  ledger: financeCaps(viewer).canView,
});

// Ο Πελάτης άλλου πωλητή: φαίνεται η ύπαρξή του και ο Υπεύθυνος, όχι τα στοιχεία (ADR 0007).
function TakenClient({ card, caps }: { card: ClientRow; caps: SalesCaps }) {
  return (
    <Frame>
      <div className="card-title">
        <h2>{card.name}</h2>
        <Badge>Άλλου πωλητή</Badge>
      </div>
      <StateNotice kind="denied" title="Ο Πελάτης ανήκει σε άλλον πωλητή">
        <p>{takenMessage(card.managerName)}</p>
        {caps.canManage && (
          <AccessRequest clientId={card.id} ownerName={card.managerName} />
        )}
        <BackToList />
      </StateNotice>
    </Frame>
  );
}

function Merged({ client }: { client: ClientDetail }) {
  return (
    <Frame>
      <StateNotice
        kind="empty"
        title={`Ο Πελάτης «${client.name}» συγχωνεύτηκε σε άλλον`}
      >
        {client.mergedIntoId && (
          <p>
            <Link
              className="button"
              data-primary="true"
              href={hrefOf("B2", { id: client.mergedIntoId })}
            >
              Άνοιγμα του ενιαίου Πελάτη
            </Link>
          </p>
        )}
        <BackToList />
      </StateNotice>
    </Frame>
  );
}

export interface Loaded {
  opportunities: Opportunity[];
  agreements: AgreementRow[] | null;
  ledger: (B2Ledger & { hasEntries: boolean }) | null;
  status: string | null;
  nextFilming: string | null;
  lists: SalesLists | null;
  assignable: Awaited<ReturnType<typeof listAssignableUsers>> | null;
  // null = ο Χρήστης δεν «Διαγράφει Πελάτες» ή δεν φόρτωσε.
  deleteState: ClientDeleteState | null;
  failed: string[];
}

async function loadClient(
  client: ClientDetail,
  rights: B2TabRights,
  caps: SalesCaps,
): Promise<Loaded> {
  const [
    opportunities,
    agreements,
    ledger,
    overviews,
    lists,
    assignable,
    deleteState,
  ] = await Promise.all([
    listClientOpportunities(client.id),
    rights.agreements ? listAgreements({ clientId: client.id }) : null,
    rights.ledger ? getLedger(client.id) : null,
    listClientOverviews([client.id]),
    listSalesLists(),
    caps.canTransfer ? listAssignableUsers() : null,
    caps.canDelete ? getClientDeleteState(client.id) : null,
  ]);
  const overview = overviews.ok ? overviews.data[0] : undefined;
  const failed = [
    !opportunities.ok && "οι Ευκαιρίες",
    agreements && !agreements.ok && "οι Συμφωνίες",
    ledger && !ledger.ok && "η Καρτέλα Πελάτη",
    !lists.ok && "τα Στάδια και οι Πηγές",
    deleteState && !deleteState.ok && "η Διαγραφή Πελάτη",
  ].filter((what): what is string => typeof what === "string");
  return {
    opportunities: opportunities.ok ? opportunities.data : [],
    agreements: agreements?.ok ? agreements.data : null,
    ledger: ledger?.ok
      ? {
          balance: ledger.data.balance,
          overdue: ledger.data.overdue,
          toInvoice: ledger.data.toInvoice?.amount ?? null,
          hasEntries: ledger.data.entries.length > 0,
        }
      : null,
    status: overview ? STATUS_LABELS[overview.status] : null,
    nextFilming: overview?.nextFilming ?? null,
    lists: lists.ok ? lists.data : null,
    assignable,
    deleteState: deleteState?.ok ? deleteState.data : null,
    failed,
  };
}

const labelsOf = (
  items: readonly { id: string; label: string }[],
): Record<string, string> =>
  Object.fromEntries(items.map((item) => [item.id, item.label]));

export interface TabInput {
  tab: B2Tab;
  viewer: Viewer;
  client: ClientDetail;
  card: ClientRow | null;
  caps: SalesCaps;
  canEdit: boolean;
  data: Loaded;
  allowed: readonly B2Tab[];
  today: string;
  sendsFilter: ClientSendsFilter;
}

export function TabContent({
  tab,
  viewer,
  client,
  card,
  caps,
  canEdit,
  data,
  allowed,
  today,
  sendsFilter,
}: TabInput) {
  if (tab === "users")
    return (
      <SpacesClientUsers clientId={client.id} clientName={client.name} viewer={viewer} />
    );
  if (tab === "agreements")
    return <AgreementsSection agreements={data.agreements ?? []} />;
  if (tab === "opportunities")
    return (
      <OpportunitiesSection
        client={client}
        canCreate={canEdit && card !== null}
        rows={opportunityRows({
          opportunities: data.opportunities,
          stageLabels: labelsOf(data.lists?.stages ?? []),
          agreements: data.agreements ?? [],
          clientManagerId: client.managerId,
          canPropose: canEdit && agreementCaps(viewer).canDraft,
          today,
        })}
      />
    );
  if (tab === "productions") return <ProductionsTab clientId={client.id} />;
  if (tab === "chat") return <ChatSection clientId={client.id} />;
  if (tab === "dispatches")
    return (
      <SpacesClientSends
        clientId={client.id}
        hasHistoryLink={sendsCaps(viewer).canView}
        filter={sendsFilter}
      />
    );
  if (tab === "ledger" && data.ledger)
    return (
      <LedgerSection
        clientId={client.id}
        ledger={data.ledger}
        hasEntries={data.ledger.hasEntries}
      />
    );
  if (tab === "activities")
    return (
      <ActivitiesTab
        clientId={client.id}
        canLog={canEdit}
        who={{
          userId: caps.userId,
          isOwner: isOwner(viewer),
          canManage: caps.canManage,
        }}
        kinds={data.lists?.activityKinds ?? []}
        openOpportunities={data.opportunities
          .filter(
            (o) =>
              o.outcome === "open" &&
              (caps.manageScope === "all" || o.managerId === caps.userId),
          )
          .map((o) => ({ id: o.id, title: o.title }))}
      />
    );
  const lines = clientSummary({
    agreements: data.agreements,
    ledger: data.ledger,
    opportunities: data.opportunities.filter(
      (o) => caps.manageScope !== "mine" || o.managerId === caps.userId,
    ),
    nextFilming: data.nextFilming,
    today,
  }).filter((line) => allowed.includes(line.tab));
  return (
    <DetailsSection
      clientId={client.id}
      lines={lines}
      isPossibleDuplicate={
        (card?.isPossibleDuplicate ?? false) && caps.canMerge
      }
      extra={
        isOwner(viewer) ? (
          <SpacesGdprClientSection clientId={client.id} />
        ) : undefined
      }
    />
  );
}

async function ClientView({
  viewer,
  client,
  card,
  caps,
  tab,
  sendsFilter,
  variant,
}: {
  viewer: Viewer;
  client: ClientDetail;
  card: ClientRow | null;
  caps: SalesCaps;
  tab: string | undefined;
  sendsFilter: ClientSendsFilter;
  variant: ProtoVariant | null;
}) {
  const access = clientAccess(caps, client);
  const isGranted = access === "granted";
  const canEdit = caps.canManage && !isGranted;
  const isReadOnly = !caps.canManage;
  const rights = rightsOf(viewer, client);
  const allowed = allowedTabs(rights, isGranted);
  const active = resolveB2Tab(tab, allowed);
  const data = await loadClient(client, rights, caps);
  const today = athensToday();
  const mine = isGranted
    ? data.opportunities.find((o) => o.managerId === caps.userId)
    : undefined;
  // PROTOTYPE: οι παραλλαγές μόνο στην κανονική όψη (όχι με πρόσβαση μέσω Ευκαιρίας).
  if (variant !== null && !isGranted)
    return (
      <Frame>
        <B2ProtoView
          variant={variant}
          viewer={viewer}
          client={client}
          card={card}
          caps={caps}
          canEdit={canEdit}
          isReadOnly={isReadOnly}
          data={data}
          allowed={allowed}
          tab={tab}
          today={today}
          renderTab={(item) => (
            <TabContent
              tab={item}
              viewer={viewer}
              client={client}
              card={card}
              caps={caps}
              canEdit={canEdit}
              data={data}
              allowed={allowed}
              today={today}
              sendsFilter={sendsFilter}
            />
          )}
        />
        <ProtoSwitcher current={variant} />
      </Frame>
    );
  return (
    <Frame>
      <Strip
        stats={clientStripStats({
          clientId: client.id,
          agreements: data.agreements,
          ledger: data.ledger,
          opportunities: data.opportunities,
          isReadOnly,
        })}
        now={null}
      />
      <div className="kit-split b2-split">
        <ClientInspector
          client={client}
          status={data.status}
          isReadOnly={isReadOnly}
          canEdit={canEdit}
          activitiesHref={
            allowed.includes("activities")
              ? hrefOf("B2", { id: client.id, tab: "activities" })
              : null
          }
          assignable={
            caps.canTransfer && data.assignable?.ok
              ? data.assignable.data
              : null
          }
          activeAgreement={
            data.agreements ? activeAgreementText(data.agreements) : null
          }
          extra={
            <>
              {data.deleteState && (
                <ClientDelete
                  clientId={client.id}
                  clientName={client.name}
                  block={data.deleteState.deleteBlock}
                />
              )}
              <SpacesHistoryLink
                viewer={viewer}
                entity="clients"
                id={client.id}
              />
            </>
          }
        />
        <div className="b2-main">
          {mine && (
            <p className="note">
              Πρόσβαση μέσω της Ευκαιρίας σου «{mine.title}» · Υπεύθυνος Πελάτη:{" "}
              {client.managerName ?? "—"}
            </p>
          )}
          {!isReadOnly && (
            <RelationshipSteps
              steps={relationshipSteps(
                data.opportunities,
                data.agreements ?? [],
              )}
            />
          )}
          {data.failed.length > 0 && (
            <ErrorNotice what={data.failed.join(", ")} />
          )}
          <nav className="tabs" aria-label="Ενότητες Πελάτη">
            {B2_TABS.filter((item) => allowed.includes(item.id)).map((item) => (
              <Link
                key={item.id}
                className="tab"
                href={hrefOf("B2", { id: client.id, tab: item.id })}
                aria-current={item.id === active ? "page" : undefined}
              >
                {item.label}
              </Link>
            ))}
          </nav>
          <TabContent
            tab={active}
            viewer={viewer}
            client={client}
            card={card}
            caps={caps}
            canEdit={canEdit}
            data={data}
            allowed={allowed}
            today={today}
            sendsFilter={sendsFilter}
          />
        </div>
      </div>
      {isProtoEnabled() && <ProtoSwitcher current={null} />}
    </Frame>
  );
}

// B2 Σελίδα Πελάτη στη νέα εμφάνιση (prototype `screens/B2.tsx`): πλαϊνή στήλη με την ταυτότητα, λωρίδα, σχέση με τον
// Πελάτη και καρτέλες. Η πρόσβαση αποφασίζεται στη βάση, όπως στη σημερινή σελίδα.
export async function SpacesClient({
  clientId,
  tab,
  sendsFilter,
  variant,
}: SpacesClientProps) {
  const viewer = await getViewer();
  const caps = salesCaps(viewer);
  if (!caps.canViewClients)
    return (
      <Frame>
        <StateNotice kind="denied" title="Χωρίς πρόσβαση στους Πελάτες">
          Τους Πελάτες τους βλέπει όποιος «Βλέπει Πελάτες» ή «Διαχειρίζεται
          Πελάτες και Ευκαιρίες».
        </StateNotice>
      </Frame>
    );
  const id = z.uuid().safeParse(clientId);
  const missing = (
    <Frame>
      <StateNotice kind="empty" title="Δεν βρέθηκε ο Πελάτης">
        <BackToList />
      </StateNotice>
    </Frame>
  );
  if (!id.success) return missing;
  const [client, card] = await Promise.all([
    getClient(id.data),
    getClientCard(id.data),
  ]);
  if (!client.ok || !card.ok)
    return (
      <Frame>
        <ErrorNotice what="η Σελίδα Πελάτη" />
      </Frame>
    );
  if (client.data === null)
    return card.data && !card.data.canOpen ? (
      <TakenClient card={card.data} caps={caps} />
    ) : (
      missing
    );
  if (client.data.archivedAt) return <Merged client={client.data} />;
  return (
    <ClientView
      viewer={viewer}
      client={client.data}
      card={card.data}
      caps={caps}
      tab={tab}
      sendsFilter={sendsFilter}
      variant={isProtoEnabled() ? parseVariant(variant) : null}
    />
  );
}
