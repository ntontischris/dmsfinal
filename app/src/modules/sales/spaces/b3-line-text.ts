// Κείμενα των γραμμών του Pipeline (κάρτα Στήλης και «Πάρε τηλέφωνο»): αρχικά για το πλακίδιο και η τελευταία επαφή.

import { fmtDate } from "@/spaces/screens/shared";

import { daysSince } from "./b3-filters";

export const initialsOf = (name: string): string =>
  name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((word) => word[0]?.toUpperCase() ?? "")
    .join("") || "—";

export const lastContactText = (
  lastContact: string | null,
  today: string,
): string => {
  if (!lastContact) return "Καμία επαφή ακόμα";
  const days = daysSince(lastContact, today);
  const ago =
    days === 0 ? "σήμερα" : days === 1 ? "χθες" : `πριν από ${days} μέρες`;
  return `Τελευταία επαφή: ${fmtDate(lastContact)} (${ago})`;
};
