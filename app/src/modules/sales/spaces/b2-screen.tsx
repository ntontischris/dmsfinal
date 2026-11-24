import Link from "next/link";
import { z } from "zod";

import { can, getViewer, isOwner, type Viewer } from "@/modules/access";
import { agreementCaps } from "@/modules/agreements";
import { canSeeClientLedger, financeCaps } from "@/modules/finance";
import { messagesCaps } from "@/modules/messages";
import {
  type ClientSendsFilter,
  canSeeClientSends,
} from "@/modules/notifications";
import { productionsCaps } from "@/modules/productions";
import { hrefOf } from "@/spaces/data/screens";
import { Badge, ErrorNotice, StateNotice } from "@/spaces/screens/shared";

import { athensToday, clientAccess, salesCaps, takenMessage } from "../helpers";
import { getClient, getClientCard } from "../queries-clients";
import type { ClientDetail, ClientRow, SalesCaps } from "../types";
import { AccessRequest } from "./access-request";
import { allowedTabs, type B2TabRights } from "./b2-adapter";
import { AttentionPanel, ClientNotices } from "./b2-briefing";
import { ClientBoxes } from "./b2-boxes";
import {
  deriveClientPage,
  type ClientPageCtx,
  type ClientPageInput,
} from "./b2-context";
import { ClientHero } from "./b2-header";
import { loadClient } from "./b2-load";
import { clientBoxesFor, openBoxOf } from "./b2-page-model";

import "../../finance/spaces/money-lines.css";
import "./b2.css";
import "./b2-lines.css";

interface SpacesClientProps {
  clientId: string;
  tab: string | undefined;
  // Τα φίλτρα της καρτέλας «Τι στάλθηκε».
  sendsFilter: ClientSendsFilter;
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
  ledger: canSeeClientLedger(viewer, client.managerId),
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
              className="ml-cta"
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

interface ClientViewProps {
  viewer: Viewer;
  client: ClientDetail;
  card: ClientRow | null;
  caps: SalesCaps;
  tab: string | undefined;
  sendsFilter: ClientSendsFilter;
}

async function ClientView(props: ClientViewProps) {
  const { viewer, client, caps } = props;
  const isGranted = clientAccess(caps, client) === "granted";
  const rights = rightsOf(viewer, client);
  const allowed = allowedTabs(rights, isGranted);
  const data = await loadClient({
    client,
    rights,
    allowed,
    caps,
    isLedgerFull: financeCaps(viewer).canView,
    who: {
      userId: caps.userId,
      isOwner: isOwner(viewer),
      canManage: caps.canManage,
    },
  });
  const input: ClientPageInput = {
    ...props,
    canEdit: caps.canManage && !isGranted,
    isReadOnly: !caps.canManage,
    data,
    allowed,
    boxes: clientBoxesFor(allowed, isOwner(viewer)),
    today: athensToday(),
    grantedVia: isGranted
      ? data.opportunities.find((o) => o.managerId === caps.userId)
      : undefined,
  };
  const ctx: ClientPageCtx = { ...input, d: deriveClientPage(input) };
  const open = openBoxOf(props.tab, ctx.boxes);
  return (
    <Frame>
      <div className="b2">
        <ClientHero ctx={ctx} />
        <ClientNotices ctx={ctx} />
        <AttentionPanel ctx={ctx} />
        <ClientBoxes ctx={ctx} open={open} />
      </div>
    </Frame>
  );
}

// B2 Σελίδα Πελάτη: κεφαλίδα με το Επόμενο βήμα, «Χρειάζεται προσοχή» πάντα ορατό και πέντε κλειστά κουτιά (Σύνοψη,
// Άνθρωποι, Δουλειές, Επικοινωνία, Καρτέλα). Η πρόσβαση αποφασίζεται στη βάση, όπως στη σημερινή σελίδα.
export async function SpacesClient({
  clientId,
  tab,
  sendsFilter,
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
    />
  );
}
