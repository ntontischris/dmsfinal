import type { BookingOptions } from "./booking-types";
import type { BookingSelection } from "./booking-links";
import type { BookingAgreement, BookingKind } from "./types";

// Τι δείχνει η E5 από το URL: η Συμφωνία και το Είδος (το πρώτο με υπόλοιπο αν δεν ζητήθηκε κάτι), και οι ώρες.
// Καθαρή συνάρτηση, χωρίς δεδομένα έξω από τις επιλογές· η βάση ξαναελέγχει ό,τι επιλεγεί.

export interface BookingPlan {
  agreement: BookingAgreement;
  kind: BookingKind;
  hours: number | null;
}

export const hasProvision = (kind: BookingKind): boolean =>
  kind.balance === null || kind.balance > 0;

const firstAvailable = (agreement: BookingAgreement): BookingKind | undefined =>
  agreement.kinds.find(hasProvision);

// Η μετάθεση δεν ελέγχει υπόλοιπο (η Παροχή είναι ήδη του Γυρίσματος)· η κράτηση ναι.
const pickKind = (
  agreement: BookingAgreement,
  kindId: string | undefined,
  isReschedule: boolean,
): BookingKind | undefined => {
  const requested = agreement.kinds.find((kind) => kind.id === kindId);
  if (requested && (isReschedule || hasProvision(requested))) return requested;
  return isReschedule ? agreement.kinds[0] : firstAvailable(agreement);
};

const pickHours = (
  durations: readonly number[],
  requested: string | undefined,
  kind: BookingKind,
): number | null => {
  const hours = Number(requested);
  if (durations.includes(hours)) return hours;
  return kind.defaultHours ?? durations[0] ?? null;
};

export const planBooking = (
  options: BookingOptions,
  selection: BookingSelection,
): BookingPlan | null => {
  const isReschedule = selection.reschedule !== undefined;
  const agreement =
    options.agreements.find((item) => item.id === selection.agreement) ??
    (isReschedule ? undefined : options.agreements.find((item) => firstAvailable(item)));
  if (!agreement) return null;
  const kind = pickKind(agreement, selection.kind, isReschedule);
  if (!kind) return null;
  return { agreement, kind, hours: pickHours(options.durations, selection.hours, kind) };
};
