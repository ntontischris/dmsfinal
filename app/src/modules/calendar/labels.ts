// Ελληνικές ετικέτες του Ημερολογίου, για τις καταστάσεις που δίνει η βάση.

const CLIENT_DAY_LABEL: Record<string, string> = {
  free: "Ελεύθερη",
  full: "Γεμάτη",
  closed: "Κλειστή",
  not_set: "Χωρίς ωράριο",
};

const TEAM_DAY_LABEL: Record<string, string> = {
  closed: "Κλειστή",
  not_set: "Χωρίς ωράριο",
};

// Η ετικέτα μιας μέρας· για αργία, το όνομά της. Άγνωστη κατάσταση δεν παίρνει ετικέτα.
export function dayStatusLabel(
  status: string | null,
  holidayName: string | null,
  isTeam: boolean,
): string | null {
  if (status === null || status === "open") return null;
  if (status === "holiday") return holidayName ?? "Αργία";
  const labels = isTeam ? TEAM_DAY_LABEL : CLIENT_DAY_LABEL;
  return labels[status] ?? (isTeam ? "Κλειστή" : null);
}

// Η μέρα είναι κλειστή για τη σκίαση: όλα εκτός από ανοιχτή και ελεύθερη/γεμάτη.
export const isShadedDay = (status: string | null): boolean =>
  status !== null &&
  status !== "open" &&
  status !== "free" &&
  status !== "full";

export const PENDING_LABEL = "Αναμένει έγκριση";
