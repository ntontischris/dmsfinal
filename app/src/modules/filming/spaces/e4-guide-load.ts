// Η προτεινόμενη ώρα του E4 μέσα στον οδηγό: ίδιος Πελάτης, Συμφωνία και είδος με όσα ανοίγει η φόρμα, το
// προεπιλεγμένο Πρότυπο Συνεργείου του είδους και τα πιασμένα διαστήματα των μελών του εκείνη τη μέρα.

import { defaultHours, defaultKindId } from "../helpers";
import { pickTemplate } from "../default-templates";
import { listCrewTemplates } from "../queries";
import type { BookingHoursView } from "../booking-types";
import type { BookingAgreement } from "../types";
import { guideStartOf, type BusyEntry } from "./e4-guide";
import type { StartSlot } from "./e4-start";

// Από το module Ημερολόγιο, μέσω της σελίδας (το Ημερολόγιο εισάγει ήδη τα Γυρίσματα· έτσι δεν κάνουμε κύκλο).
export type E4BusySource = (day: string) => Promise<readonly BusyEntry[] | null>;

export interface E4CrewNote {
  date: string;
  template: string;
}

interface GuideLoadInput {
  options: readonly BookingAgreement[];
  clientId: string | null;
  hours: BookingHoursView | null;
  slot: StartSlot;
  busyOn: E4BusySource;
}

const kindOf = (options: readonly BookingAgreement[], clientId: string | null) => {
  const agreement =
    options.find((item) => item.client.id === clientId) ?? options[0];
  const kinds = agreement?.kinds ?? [];
  return kinds.find((kind) => kind.id === defaultKindId(kinds));
};

// Με αποτυχία ανάγνωσης (Πρότυπα, Ημερολόγιο) μένει η πρώτη εργάσιμη ώρα, χωρίς προειδοποίηση.
export async function guideSlotOf(
  input: GuideLoadInput,
): Promise<{ slot: StartSlot; crewNote: E4CrewNote | null }> {
  const { slot } = input;
  const kind = kindOf(input.options, input.clientId);
  const [templates, busy] = await Promise.all([
    listCrewTemplates(),
    input.busyOn(slot.date),
  ]);
  const template = templates.ok ? pickTemplate(templates.data, kind?.label ?? "") : undefined;
  if (!template || !busy) return { slot, crewNote: null };
  const result = guideStartOf({
    hours: input.hours,
    stepMinutes: input.hours?.stepMinutes ?? 30,
    slot,
    length: defaultHours(kind),
    members: template.members.map((member) => member.id),
    busy,
  });
  return result.kind === "free"
    ? { slot: result.slot, crewNote: null }
    : { slot, crewNote: { date: slot.date, template: template.name } };
}
