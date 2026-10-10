import Link from "next/link";
import { z } from "zod";

import { ScreenHeader } from "@/components/shell/screen-header";
import { buttonVariants } from "@/components/ui/button";
import { FormMessage } from "@/components/ui/form-message";
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
  kindDefaultHours,
  listBookingOptions,
  listCrewBlocked,
  listCrewTemplates,
  ReschedulePanel,
  checkSlot,
  listEquipmentCandidates,
  type FilmingCard,
} from "@/modules/filming";

import { LoadError, Missing, NoAccess } from "../filming-parts";

export const metadata = { title: "Γύρισμα" };

const EYEBROW = "E3 · Γύρισμα";
const doneSchema = z.enum(["booked", "rescheduled"]).optional().catch(undefined);

// E3: ένα Γύρισμα. Κάθε ενέργεια και κάθε φόρμα εμφανίζεται μόνο αν το viewerCan της βάσης το επιτρέπει.
export default async function FilmingPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ done?: string | string[] }>;
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
  const done = doneSchema.parse((await searchParams).done);
  return <FilmingPageContent card={filming.data} canBook={caps.canBook} done={done} />;
}

// Οι λίστες υποψηφίων φορτώνουν μόνο όπου το Δικαίωμα της κάρτας τις θέλει.
async function FilmingPageContent({
  card,
  canBook,
  done,
}: {
  card: FilmingCard;
  canBook: boolean;
  done: "booked" | "rescheduled" | undefined;
}) {
  const canCrew = card.viewerCan.crew;
  const canEquipment = card.viewerCan.equipment;
  const pending = card.signals.pendingReschedule;
  const checksNewTime = pending !== null && card.viewerCan.decideReschedule && canBook;
  const [
    crewCandidates,
    crewTemplates,
    equipmentCandidates,
    equipmentTemplates,
    bookingOptions,
    newTimeCheck,
    crewBlocked,
  ] = await Promise.all([
    canCrew ? listCrewCandidates() : null,
    canCrew ? listCrewTemplates() : null,
    canEquipment ? listEquipmentCandidates() : null,
    canEquipment ? listTemplates() : null,
    card.viewerCan.reschedule ? listBookingOptions() : null,
    checksNewTime ? checkSlot(pending.startsAt, pending.hours, card.id) : null,
    canCrew ? listCrewBlocked(card.startsAt, card.hours) : null,
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
      {done && <FormMessage state={{ notice: doneMessage(done, card) }} />}
      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <FilmingHeader card={card} />
        <ReschedulePanel
          card={card}
          newTimeProblem={newTimeCheck?.ok ? newTimeCheck.data.problem : null}
        />
        <ProvisionCard provision={card.provision} />
        <DecisionPanel card={card} />
        <OutcomePanel
          card={card}
          defaultHours={
            bookingOptions?.ok
              ? kindDefaultHours(bookingOptions.data, card.agreement?.id, card.kind?.id)
              : null
          }
        />
        {(canCrew || card.crew.length > 0) && (
          <CrewPanel
            card={card}
            candidates={crewCandidates?.ok ? crewCandidates.data : []}
            templates={crewTemplates?.ok ? crewTemplates.data : []}
            blockedIds={crewBlocked?.ok ? crewBlocked.data : []}
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

// Το μήνυμα μετά από κράτηση ή μετάθεση: η κατάσταση δείχνει αν μπήκε σε έγκριση.
function doneMessage(done: "booked" | "rescheduled", card: FilmingCard): string {
  if (done === "booked")
    return card.state === "pending"
      ? "Η κράτηση στάλθηκε για έγκριση."
      : "Η κράτηση επιβεβαιώθηκε.";
  return card.signals.pendingReschedule
    ? "Η μετάθεση στάλθηκε για έγκριση."
    : "Η μετάθεση έγινε.";
}
