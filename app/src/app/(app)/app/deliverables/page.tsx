import { ScreenHeader } from "@/components/shell/screen-header";
import { getViewer, isClientViewer } from "@/modules/access";
import {
  ChargeDecisionsPanel,
  QueueTable,
  QueueTabs,
  deliverablesCaps,
  listDeliverableQueue,
  listPendingCharges,
  parseQueueView,
  queueFilterSchema,
  queueViewsOf,
} from "@/modules/deliverables";

import { ClientQueueScreen } from "./client-screens";
import { LoadError, NoAccess } from "./page-parts";

export const metadata = { title: "Παραδοτέα" };

const EYEBROW = "H1 · Παραδοτέα";
const DEFAULT_FILTER = { view: "mine" } as const;

// H1: η ουρά των Παραδοτέων. Η καρτέλα είναι στη διεύθυνση· η βάση αποφασίζει τι βλέπεις.
export default async function DeliverablesPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const viewer = await getViewer();
  if (isClientViewer(viewer)) return <ClientQueueScreen viewer={viewer} />;
  const caps = deliverablesCaps(viewer);
  if (!caps.canQueue) return <NoAccess viewer={viewer} />;

  const parsed = queueFilterSchema.safeParse(await searchParams);
  const filter = parsed.success ? parsed.data : DEFAULT_FILTER;
  const views = queueViewsOf(caps.canReview);
  const view = parseQueueView(filter.view, views);
  const [queue, charges] = await Promise.all([
    listDeliverableQueue(view),
    caps.canSeeCharges ? listPendingCharges() : null,
  ]);
  if (!queue.ok || (charges !== null && !charges.ok)) return <LoadError />;

  return (
    <>
      <ScreenHeader eyebrow={EYEBROW} title="Παραδοτέα" />
      <div className="grid gap-4">
        {charges?.ok && charges.data.length > 0 && <ChargeDecisionsPanel cards={charges.data} />}
        <QueueTabs view={view} views={views} />
        <QueueTable cards={queue.data} view={view} />
      </div>
    </>
  );
}
