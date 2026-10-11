import Link from "next/link";
import { z } from "zod";

import { ScreenHeader } from "@/components/shell/screen-header";
import { buttonVariants } from "@/components/ui/button";
import { getViewer, type Viewer } from "@/modules/access";
import { costsCaps } from "@/modules/costs";
import {
  ProductionDeliverables,
  deliverablesCaps,
  getDeliverableCandidates,
} from "@/modules/deliverables";
import { messagesCaps, threadHref } from "@/modules/messages";
import {
  AgreementCard,
  HistoryPanel,
  MembersPanel,
  OwnerPanel,
  PeriodCard,
  ProductionFilmings,
  StatePanel,
  TasksPanel,
  getProduction,
  listMemberCandidates,
  listOwnerCandidates,
  productionsCaps,
  type ProductionDetail,
} from "@/modules/productions";

import { ClientProductionScreen } from "../client-production-screen";
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
  if (caps.isClient)
    return <ClientProductionScreen production={production.data} />;
  const canWorkDeliverables = deliverablesCaps(viewer).canWork;
  return (
    <ProductionPageContent
      production={production.data}
      showCosts={costsCaps(viewer).canView}
      canWorkDeliverables={canWorkDeliverables}
      messagesHref={messagesHrefOf(viewer, production.data)}
    />
  );
}

// Το «Μηνύματα» της Παραγωγής ανοίγει τη Συνομιλία του Πελάτη με προεπιλεγμένη ετικέτα· μόνο για όσους έχουν «Συνομιλεί με πελάτη».
const messagesHrefOf = (viewer: Viewer, production: ProductionDetail): string | null =>
  production.client !== null && messagesCaps(viewer).canChat
    ? threadHref(production.client.id, { production: production.id })
    : null;

// Οι λίστες υποψηφίων φορτώνουν μόνο όπου το Δικαίωμα τις θέλει (μεταβίβαση, Μέλη, Παραδοτέα).
async function ProductionPageContent({
  production,
  showCosts,
  canWorkDeliverables,
  messagesHref,
}: {
  production: ProductionDetail;
  showCosts: boolean;
  canWorkDeliverables: boolean;
  messagesHref: string | null;
}) {
  const canTransfer = production.viewerCan.transfer;
  const canManage = production.viewerCan.members;
  const [owners, members, deliverables] = await Promise.all([
    canTransfer ? listOwnerCandidates() : null,
    canManage ? listMemberCandidates() : null,
    canWorkDeliverables ? getDeliverableCandidates(production.id) : null,
  ]);
  if (
    (owners !== null && !owners.ok) ||
    (members !== null && !members.ok) ||
    (deliverables !== null && !deliverables.ok)
  )
    return <LoadError />;

  return (
    <>
      <ScreenHeader eyebrow={EYEBROW} title={production.title}>
        <Link
          href="/app/productions"
          className={buttonVariants({ variant: "ghost" })}
        >
          ← Παραγωγές
        </Link>
        {messagesHref && (
          <Link href={messagesHref} className={buttonVariants({ variant: "ghost" })}>
            Μηνύματα
          </Link>
        )}
        {showCosts && (
          <Link
            href={`/app/productions/${production.id}/costs`}
            className={buttonVariants({ variant: "ghost" })}
          >
            Κόστος και ώρες
          </Link>
        )}
      </ScreenHeader>
      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <StatePanel production={production} />
        <OwnerPanel
          production={production}
          candidates={owners?.ok ? owners.data : []}
        />
        <AgreementCard agreement={production.agreement} />
        <PeriodCard period={production.period} balances={production.balances} />
        {(canManage || production.members.length > 0) && (
          <MembersPanel
            production={production}
            candidates={members?.ok ? members.data : []}
          />
        )}
        <ProductionFilmings filmings={production.filmings} />
        <TasksPanel
          production={production}
          candidates={members?.ok ? members.data : []}
        />
        <ProductionDeliverables
          productionId={production.id}
          productionTitle={production.title}
          client={production.client?.name ?? null}
          isInternal={production.client === null}
          cards={production.deliverables}
          candidates={deliverables?.ok ? deliverables.data : null}
        />
        {canManage && <HistoryPanel history={production.history} />}
      </div>
    </>
  );
}
