// Τα στοιχεία της κάρτας του βήματος 1 για το αίτημα που φαίνεται: αν η ώρα πιάστηκε και ποια γραμμή συνοδεύει την κύρια
// απάντηση. Μόνο για αυτό το ένα αίτημα (καμία σελίδα δεν φορτώνει τα πάντα).

import { pickTemplate } from "../default-templates";
import { getFilming, listCrewTemplates } from "../queries";
import { checkSlot } from "../queries-booking";
import type { ReadResult } from "../read";
import { freedLineOf, teamLineOf, type GuideRequest } from "./e2-guide-model";

export interface FocusDetails {
  // Τι πιάνει την ώρα τώρα (μόνο νέα κράτηση· της μετάθεσης έρχεται από την ουρά).
  slotProblem: string | null;
  // Η γραμμή κάτω από την κύρια απάντηση: «Πάνε: …» ή «Θα ελευθερωθούν: …».
  approveLine: string | null;
}

export type EquipmentTemplatesSource = () => Promise<
  ReadResult<readonly { name: string; items: readonly { name: string }[] }[]>
>;

// Νέα κράτηση: ποιοι θα μπουν από τα προεπιλεγμένα Πρότυπα του είδους.
async function bookingDetails(request: GuideRequest, equipmentTemplates: EquipmentTemplatesSource): Promise<FocusDetails> {
  const [slot, crew, items] = await Promise.all([
    checkSlot(request.startsAt, request.hours, request.id),
    listCrewTemplates(),
    equipmentTemplates(),
  ]);
  const crewTemplate = crew.ok ? pickTemplate(crew.data, request.kindLabel) : undefined;
  const itemTemplate = items.ok ? pickTemplate(items.data, request.kindLabel) : undefined;
  return {
    slotProblem: slot.ok ? slot.data.problem : null,
    approveLine: teamLineOf(
      crewTemplate?.members.map((member) => member.name) ?? [],
      itemTemplate?.items.map((item) => item.name) ?? [],
    ),
  };
}

// Μετάθεση: μένει η ομάδα του Γυρίσματος. Ακύρωση: τι ελευθερώνεται.
async function teamDetails(request: GuideRequest): Promise<FocusDetails> {
  const card = await getFilming(request.id);
  if (!card.ok || !card.data) return { slotProblem: null, approveLine: null };
  const { crew, equipment, team } = card.data;
  return {
    slotProblem: null,
    approveLine:
      request.kind === "cancel"
        ? freedLineOf(crew.length, equipment.length, team?.google.state === "synced")
        : teamLineOf(
            crew.map((member) => member.name),
            equipment.map((line) => line.name),
          ),
  };
}

export const loadFocusDetails = (
  request: GuideRequest,
  equipmentTemplates: EquipmentTemplatesSource,
): Promise<FocusDetails> =>
  request.kind === "booking" ? bookingDetails(request, equipmentTemplates) : teamDetails(request);
