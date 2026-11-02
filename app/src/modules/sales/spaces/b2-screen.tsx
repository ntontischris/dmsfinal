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
import { AuditHistoryLink } from "@/modules/audit";
import { financeCaps, getLedger } from "@/modules/finance";
import { GdprClientPanel } from "@/modules/gdpr";
import { messagesCaps } from "@/modules/messages";
import {
  ClientSends,
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
  listClientOpportunities,
} from "../queries-clients";
import { listSalesLists } from "../queries-lists";
import { listClientOverviews } from "../queries-overview";
import { listAssignableUsers } from "../queries-queue";
import type {
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
import { ClientInspector, RelationshipSteps } from "./b2-inspector";
import { ActivitiesTab, ProductionsTab } from "./b2-tabs";
import {
  AgreementsSection,
  ChatSection,
  DetailsSection,
  EmbeddedSection,
  LedgerSection,
  OpportunitiesSection,
} from "./b2-sections";

import "./b2.css";

interface SpacesClientProps {
  clientId: string;
  tab: string | undefined;
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
async function TakenClient({
  card,
  caps,
}: {
  card: ClientRow;
  caps: SalesCaps;
}) {
  const lists = caps.canManage ? await listSalesLists() : null;
  return (
    <Frame>
      <div className="card-title">
        <h2>{card.name}</h2>
        <Badge>Άλλου πωλητή</Badge>
      </div>
      <StateNotice kind="denied" title="Ο Πελάτης ανήκει σε άλλον πωλητή">
        <p>{takenMessage(card.managerName)}</p>
        {lists?.ok && (
          <AccessRequest
            clientId={card.id}
            ownerName={card.managerName}
            sources={lists.data.sources}
          />
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

interface Loaded {
  opportunities: Opportunity[];
  agreements: AgreementRow[] | null;
  ledger: (B2Ledger & { hasEntries: boolean }) | null;
  status: string | null;
  nextFilming: string | null;
  lists: SalesLists | null;
  assignable: Awaited<ReturnType<typeof listAssignableUsers>> | null;
  failed: string[];
}

async function loadClient(
  client: ClientDetail,
  rights: B2TabRights,
  caps: SalesCaps,
): Promise<Loaded> {
  const [opportunities, agreements, ledger, overviews, lists, assignable] =
    await Promise.all([
      listClientOpportunities(client.id),
      rights.agreements ? listAgreements({ clientId: client.id }) : null,
      rights.ledger ? getLedger(client.id) : null,
      listClientOverviews([client.id]),
      listSalesLists(),
      caps.canTransfer ? listAssignableUsers() : null,
    ]);
  const overview = overviews.ok ? overviews.data[0] : undefined;
  const failed = [
    !opportunities.ok && "οι Ευκαιρίες",
    agreements && !agreements.ok && "οι Συμφωνίες",
    ledger && !ledger.ok && "η Καρτέλα Πελάτη",
    !lists.ok && "τα Στάδια και οι Πηγές",
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
    failed,
  };
}

const labelsOf = (
  items: readonly { id: string; label: string }[],
): Record<string, string> =>
  Object.fromEntries(items.map((item) => [item.id, item.label]));

interface TabInput {
  tab: B2Tab;
  viewer: Viewer;
  client: ClientDetail;
  card: ClientRow | null;
  caps: SalesCaps;
  canEdit: boolean;
  data: Loaded;
  allowed: readonly B2Tab[];
  today: string;
}

function TabContent({
  tab,
  viewer,
  client,
  card,
  caps,
  canEdit,
  data,
  allowed,
  today,
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
        sources={canEdit && card ? (data.lists?.sources ?? null) : null}
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
      <EmbeddedSection label="Τι στάλθηκε στον Πελάτη">
        <ClientSends
          clientId={client.id}
          hasHistoryLink={sendsCaps(viewer).canView}
        />
      </EmbeddedSection>
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
          <EmbeddedSection>
            <GdprClientPanel clientId={client.id} />
          </EmbeddedSection>
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
}: {
  viewer: Viewer;
  client: ClientDetail;
  card: ClientRow | null;
  caps: SalesCaps;
  tab: string | undefined;
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
            <span data-tw>
              <AuditHistoryLink
                viewer={viewer}
                entity="clients"
                id={client.id}
              />
            </span>
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
          />
        </div>
      </div>
    </Frame>
  );
}

// B2 Σελίδα Πελάτη στη νέα εμφάνιση (prototype `screens/B2.tsx`): πλαϊνή στήλη με την ταυτότητα, λωρίδα, σχέση με τον
// Πελάτη και καρτέλες. Η πρόσβαση αποφασίζεται στη βάση, όπως στη σημερινή σελίδα.
export async function SpacesClient({ clientId, tab }: SpacesClientProps) {
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
    />
  );
}
