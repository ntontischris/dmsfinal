import Link from "next/link";

import { ScreenHeader } from "@/components/shell/screen-header";
import { Notice } from "@/components/ui/notice";
import { Panel } from "@/components/ui/panel";
import { AccessNotice, getViewer } from "@/modules/access";
import {
  AccessRequests,
  UnassignedQueue,
  listAccessRequests,
  listAssignableUsers,
  listQueue,
  listSalesLists,
  salesCaps,
  type SalesCaps,
} from "@/modules/sales";

export const metadata = { title: "Χωρίς υπεύθυνο" };

const header = (
  <ScreenHeader eyebrow="B5 · Πελάτες και Πωλήσεις" title="Χωρίς υπεύθυνο" />
);

function RoutingHint({ canManageSettings }: { canManageSettings: boolean }) {
  return (
    <p className="m-0 text-sm text-muted-foreground">
      Πού πάνε οι νέες Ευκαιρίες από τη φόρμα:{" "}
      {canManageSettings ? (
        <Link href="/app/settings/sales">Ρυθμίσεις › Πωλήσεις</Link>
      ) : (
        "Ρυθμίσεις › Πωλήσεις"
      )}
    </p>
  );
}

function RequestsHint() {
  return (
    <p className="m-0 text-sm text-muted-foreground">
      Ένας Πελάτης έχει έναν πωλητή. Εδώ αποφασίζεις αν άλλος πωλητής ανοίγει
      Ευκαιρία σε Πελάτη που δεν είναι δικός του.
    </p>
  );
}

async function UnassignedBody({ caps }: { caps: SalesCaps }) {
  const [queue, requests, assignable, lists] = await Promise.all([
    listQueue(),
    listAccessRequests(),
    listAssignableUsers(),
    listSalesLists(),
  ]);
  if (!queue.ok || !requests.ok || !assignable.ok || !lists.ok)
    return (
      <Notice kind="error" title="Δεν φόρτωσε η ουρά">
        <p className="m-0">Τίποτα δεν χάθηκε. Δοκίμασε ξανά σε λίγο.</p>
      </Notice>
    );

  return (
    <div className="grid gap-4">
      <Panel label="Ευκαιρίες χωρίς Υπεύθυνο">
        <div className="grid gap-4">
          <RoutingHint canManageSettings={caps.canManageSettings} />
          <UnassignedQueue
            items={queue.data}
            assignable={assignable.data}
            sources={lists.data.sources}
          />
        </div>
      </Panel>
      <Panel label="Αιτήματα πρόσβασης">
        <div className="grid gap-4">
          <RequestsHint />
          <AccessRequests
            requests={requests.data}
            assignable={assignable.data}
          />
        </div>
      </Panel>
    </div>
  );
}

// B5 Χωρίς υπεύθυνο: η ουρά των Ευκαιριών της φόρμας και τα Αιτήματα πρόσβασης. Τη σελίδα τη βλέπει όποιος «Μεταβιβάζει Υπεύθυνο».
export default async function UnassignedPage() {
  const viewer = await getViewer();
  const caps = salesCaps(viewer);
  if (!caps.canTransfer)
    return (
      <>
        {header}
        <AccessNotice viewer={viewer}>
          <p className="m-0">
            Την ουρά «Χωρίς υπεύθυνο» τη βλέπει όποιος «Μεταβιβάζει Υπεύθυνο».
          </p>
        </AccessNotice>
      </>
    );

  return (
    <>
      {header}
      <UnassignedBody caps={caps} />
    </>
  );
}
