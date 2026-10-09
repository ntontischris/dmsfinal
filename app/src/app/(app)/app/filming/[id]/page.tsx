import Link from "next/link";
import { z } from "zod";

import { ScreenHeader } from "@/components/shell/screen-header";
import { buttonVariants } from "@/components/ui/button";
import { getViewer } from "@/modules/access";
import { listTemplates } from "@/modules/equipment";
import {
  CrewPanel,
  DecisionPanel,
  EquipmentPanel,
  FilmingHeader,
  FilmingHistory,
  FilmingNotes,
  OutcomePanel,
  ProvisionCard,
  filmingCaps,
  getFilming,
  listCrewCandidates,
  listCrewTemplates,
  listEquipmentCandidates,
  type FilmingCard,
} from "@/modules/filming";

import { LoadError, Missing, NoAccess } from "../filming-parts";

export const metadata = { title: "Γύρισμα" };

const EYEBROW = "E3 · Γύρισμα";

// E3: ένα Γύρισμα. Κάθε ενέργεια και κάθε φόρμα εμφανίζεται μόνο αν το viewerCan της βάσης το επιτρέπει.
export default async function FilmingPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const viewer = await getViewer();
  const caps = filmingCaps(viewer);
  if (!caps.canView)
    return (
      <NoAccess
        viewer={viewer}
        eyebrow={EYEBROW}
        message="Τα Γυρίσματα τα βλέπει όποιος «Βλέπει Γυρίσματα»."
      />
    );

  const { id } = await params;
  const parsed = z.uuid().safeParse(id);
  if (!parsed.success) return <Missing />;

  const filming = await getFilming(parsed.data);
  if (!filming.ok) return <LoadError />;
  if (filming.data === null) return <Missing />;
  return <FilmingPageContent card={filming.data} />;
}

// Οι λίστες υποψηφίων φορτώνουν μόνο όπου το Δικαίωμα της κάρτας τις θέλει.
async function FilmingPageContent({ card }: { card: FilmingCard }) {
  const canCrew = card.viewerCan.crew;
  const canEquipment = card.viewerCan.equipment;
  const [
    crewCandidates,
    crewTemplates,
    equipmentCandidates,
    equipmentTemplates,
  ] = await Promise.all([
    canCrew ? listCrewCandidates() : null,
    canCrew ? listCrewTemplates() : null,
    canEquipment ? listEquipmentCandidates() : null,
    canEquipment ? listTemplates() : null,
  ]);
  if (
    (crewCandidates !== null && !crewCandidates.ok) ||
    (crewTemplates !== null && !crewTemplates.ok) ||
    (equipmentCandidates !== null && !equipmentCandidates.ok)
  )
    return <LoadError />;

  return (
    <>
      <ScreenHeader eyebrow={EYEBROW} title={card.production.title}>
        <Link
          href="/app/filming"
          className={buttonVariants({ variant: "ghost" })}
        >
          ← Γυρίσματα
        </Link>
      </ScreenHeader>
      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <FilmingHeader card={card} />
        <ProvisionCard provision={card.provision} />
        <DecisionPanel card={card} />
        <OutcomePanel card={card} />
        {(canCrew || card.crew.length > 0) && (
          <CrewPanel
            card={card}
            candidates={crewCandidates?.ok ? crewCandidates.data : []}
            templates={crewTemplates?.ok ? crewTemplates.data : []}
          />
        )}
        {(canEquipment || card.equipment.length > 0) && (
          <EquipmentPanel
            card={card}
            candidates={equipmentCandidates?.ok ? equipmentCandidates.data : []}
            templates={
              equipmentTemplates?.ok
                ? equipmentTemplates.data.map(({ id, name }) => ({ id, name }))
                : []
            }
          />
        )}
        <FilmingNotes card={card} />
        {card.history.length > 0 && <FilmingHistory card={card} />}
      </div>
    </>
  );
}
