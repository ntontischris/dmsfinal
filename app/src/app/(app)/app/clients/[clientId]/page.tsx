import type { ReactNode } from "react";
import { z } from "zod";

import { ScreenHeader } from "@/components/shell/screen-header";
import { Split } from "@/components/ui/inspector";
import { ClientUsersSection, can, getViewer, type Viewer } from "@/modules/access";
import {
  ClientInspector,
  clientAccess,
  getClient,
  getClientCard,
  listAssignableUsers,
  salesCaps,
  type ClientDetail,
  type ClientRow,
  type SalesCaps,
} from "@/modules/sales";

import {
  ClientTabs,
  EYEBROW,
  GrantedNote,
  LoadFailed,
  Merged,
  Missing,
  NoAccess,
  TabContent,
  TakenClient,
  resolveTab,
} from "./page-parts";

export const metadata = { title: "Πελάτης" };

async function ClientView({
  client,
  card,
  caps,
  tab,
  usersSection,
}: {
  client: ClientDetail;
  card: ClientRow | null;
  caps: SalesCaps;
  tab: string | undefined;
  usersSection: ReactNode;
}) {
  const access = clientAccess(caps, client);
  const canEdit = caps.canManage && access !== "granted";
  const current = resolveTab(tab, access);
  const assignable = caps.canTransfer ? await listAssignableUsers() : null;
  return (
    <>
      <ScreenHeader eyebrow={EYEBROW} title={client.name} />
      <Split>
        <ClientInspector
          client={client}
          canEdit={canEdit}
          canTransfer={caps.canTransfer}
          assignable={assignable?.ok ? assignable.data : []}
        />
        <div className="grid min-w-0 gap-4">
          <ClientTabs clientId={client.id} current={current} access={access} />
          {access === "granted" && <GrantedNote client={client} caps={caps} />}
          <TabContent
            tab={current}
            client={client}
            card={card}
            caps={caps}
            canEdit={canEdit}
          />
          {usersSection}
        </div>
      </Split>
    </>
  );
}

// Ο Πελάτης που η βάση δεν δείχνει: ή ανήκει σε άλλον (φαίνεται η ύπαρξή του) ή δεν υπάρχει.
function ClientOutcome({
  client,
  card,
  caps,
  tab,
  usersSection,
}: {
  client: ClientDetail | null;
  card: ClientRow | null;
  caps: SalesCaps;
  tab: string | undefined;
  usersSection: ReactNode;
}) {
  if (client === null)
    return card && !card.canOpen ? (
      <TakenClient card={card} caps={caps} />
    ) : (
      <Missing />
    );
  if (client.archivedAt) return <Merged client={client} />;
  return (
    <ClientView client={client} card={card} caps={caps} tab={tab} usersSection={usersSection} />
  );
}

// B2: Inspector με την ταυτότητα, καρτέλες για Ευκαιρίες και Δραστηριότητες. Η πρόσβαση αποφασίζεται στη βάση.
export default async function ClientPage({
  params,
  searchParams,
}: {
  params: Promise<{ clientId: string }>;
  searchParams: Promise<{ tab?: string }>;
}) {
  const viewer = await getViewer();
  const caps = salesCaps(viewer);
  if (!caps.canViewClients) return <NoAccess viewer={viewer} />;

  const [{ clientId }, { tab }] = await Promise.all([params, searchParams]);
  const id = z.uuid().safeParse(clientId);
  if (!id.success) return <Missing />;

  const [client, card] = await Promise.all([
    getClient(id.data),
    getClientCard(id.data),
  ]);
  if (!client.ok || !card.ok) return <LoadFailed />;
  return (
    <ClientOutcome
      client={client.data}
      card={card.data}
      caps={caps}
      tab={typeof tab === "string" ? tab : undefined}
      usersSection={usersSectionFor(viewer, id.data, client.data)}
    />
  );
}

// N2 Χρήστες πελάτη: μόνο όποιος «Προσκαλεί και αφαιρεί Χρήστες πελάτη», και μόνο σε Πελάτη που δεν είναι αρχειοθετημένος.
function usersSectionFor(viewer: Viewer, clientId: string, client: ClientDetail | null): ReactNode {
  if (!client || client.archivedAt || !can(viewer, "access.clientUsers")) return null;
  return <ClientUsersSection clientId={clientId} viewer={viewer} />;
}
