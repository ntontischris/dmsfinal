import Link from "next/link";
import { z } from "zod";

import { ScreenHeader } from "@/components/shell/screen-header";
import { buttonVariants } from "@/components/ui/button";
import { getViewer } from "@/modules/access";
import {
  AgreementCard,
  HistoryPanel,
  MembersPanel,
  OwnerPanel,
  PeriodCard,
  StatePanel,
  getProduction,
  listMemberCandidates,
  listOwnerCandidates,
  productionsCaps,
  type ProductionDetail,
} from "@/modules/productions";

import { LoadError, Missing, NoAccess } from "../productions-parts";

export const metadata = { title: "Παραγωγή" };

const EYEBROW = "G2 · Παραγωγή";

// G2: μία Παραγωγή. Ό,τι δεν επιτρέπεται στον θεατή δεν εμφανίζεται· η βάση ξαναελέγχει κάθε ενέργεια.
export default async function ProductionPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const viewer = await getViewer();
  const caps = productionsCaps(viewer);
  if (!caps.canView) return <NoAccess viewer={viewer} eyebrow={EYEBROW} />;

  const { id } = await params;
  const parsed = z.uuid().safeParse(id);
  if (!parsed.success) return <Missing />;

  const production = await getProduction(parsed.data);
  if (!production.ok) return <LoadError />;
  if (production.data === null) return <Missing />;
  return <ProductionPageContent production={production.data} />;
}

// Οι λίστες υποψηφίων φορτώνουν μόνο όπου το Δικαίωμα τις θέλει (μεταβίβαση, Μέλη).
async function ProductionPageContent({ production }: { production: ProductionDetail }) {
  const canTransfer = production.viewerCan.transfer;
  const canManage = production.viewerCan.members;
  const [owners, members] = await Promise.all([
    canTransfer ? listOwnerCandidates() : null,
    canManage ? listMemberCandidates() : null,
  ]);
  if ((owners !== null && !owners.ok) || (members !== null && !members.ok)) return <LoadError />;

  return (
    <>
      <ScreenHeader eyebrow={EYEBROW} title={production.title}>
        <Link href="/app/productions" className={buttonVariants({ variant: "ghost" })}>
          ← Παραγωγές
        </Link>
      </ScreenHeader>
      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <StatePanel production={production} />
        <OwnerPanel production={production} candidates={owners?.ok ? owners.data : []} />
        <AgreementCard agreement={production.agreement} />
        <PeriodCard period={production.period} balances={production.balances} />
        {(canManage || production.members.length > 0) && (
          <MembersPanel production={production} candidates={members?.ok ? members.data : []} />
        )}
        {canManage && <HistoryPanel history={production.history} />}
      </div>
    </>
  );
}
