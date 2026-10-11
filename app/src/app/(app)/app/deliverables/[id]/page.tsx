import Link from "next/link";
import { z } from "zod";

import { ScreenHeader } from "@/components/shell/screen-header";
import { buttonVariants } from "@/components/ui/button";
import { getViewer, isClientViewer } from "@/modules/access";
import {
  DeliverableDetailView,
  deliverablesCaps,
  getDeliverable,
  getDeliverableCandidates,
} from "@/modules/deliverables";

import { ClientDetailScreen } from "../client-screens";
import { LoadError, Missing, NoAccess } from "../page-parts";

export const metadata = { title: "Παραδοτέο" };

const EYEBROW = "H2 · Παραδοτέο";

// H2: ένα Παραδοτέο. Ό,τι δεν επιτρέπεται στον θεατή δεν εμφανίζεται· η βάση ξαναελέγχει κάθε ενέργεια.
export default async function DeliverablePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const viewer = await getViewer();
  const { id } = await params;
  const parsed = z.uuid().safeParse(id);
  if (isClientViewer(viewer)) {
    return parsed.success ? <ClientDetailScreen viewer={viewer} id={parsed.data} /> : <Missing />;
  }
  const caps = deliverablesCaps(viewer);
  if (!caps.canQueue) return <NoAccess viewer={viewer} />;
  if (!parsed.success) return <Missing />;

  const detail = await getDeliverable(parsed.data);
  if (!detail.ok) return <LoadError />;
  if (detail.data === null) return <Missing />;

  const candidates = caps.canWork ? await getDeliverableCandidates(detail.data.productionId) : null;
  if (candidates !== null && !candidates.ok) return <LoadError />;

  return (
    <>
      <ScreenHeader eyebrow={EYEBROW} title={detail.data.production}>
        <Link href="/app/deliverables" className={buttonVariants({ variant: "ghost" })}>
          ← Παραδοτέα
        </Link>
      </ScreenHeader>
      <div className="mt-4">
        <DeliverableDetailView
          detail={detail.data}
          candidates={candidates?.ok ? candidates.data : null}
          canSeeAmounts={caps.canSeeAmounts}
        />
      </div>
    </>
  );
}
