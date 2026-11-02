import Link from "next/link";
import { z } from "zod";

import { lookOf } from "@/components/shell/read-look";
import { ScreenHeader } from "@/components/shell/screen-header";
import { buttonVariants } from "@/components/ui/button";
import { getViewer, isClientViewer } from "@/modules/access";
import {
  DeliverableDetailView,
  SpacesClientDeliverable,
  SpacesDeliverable,
  deliverablesCaps,
  getDeliverable,
  getDeliverableCandidates,
} from "@/modules/deliverables";

import { ClientDetailScreen } from "../client-screens";
import { LoadError, Missing, NoAccess } from "../page-parts";

export const metadata = { title: "Παραδοτέο" };

const EYEBROW = "H2 · Παραδοτέο";

// H2: ένα Παραδοτέο. Ό,τι δεν επιτρέπεται στον θεατή δεν εμφανίζεται· η βάση ξαναελέγχει κάθε ενέργεια.
// Στη νέα εμφάνιση (Χώροι) η οθόνη του prototype· αλλιώς η σημερινή. Ο Χρήστης πελάτη βλέπει την H4 (και αυτή στις δύο εμφανίσεις).
export default async function DeliverablePage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const viewer = await getViewer();
  const { id } = await params;
  const parsed = z.uuid().safeParse(id);
  if (isClientViewer(viewer)) {
    if ((await lookOf(viewer)) === "spaces")
      return (
        <SpacesClientDeliverable
          viewer={viewer}
          id={parsed.success ? parsed.data : null}
          query={await searchParams}
        />
      );
    return parsed.success ? <ClientDetailScreen viewer={viewer} id={parsed.data} /> : <Missing />;
  }
  if ((await lookOf(viewer)) === "spaces")
    return (
      <SpacesDeliverable id={parsed.success ? parsed.data : null} query={await searchParams} />
    );
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
