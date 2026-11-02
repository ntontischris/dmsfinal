import type { ClientProgress } from "@/modules/deliverables";
import type { StatProps } from "@/spaces/kit/panel";

import type { PeriodBalance, ProductionFilming } from "../types";

// Καθαρές συναρτήσεις της Σελίδας Παραγωγής στην όψη πελάτη (prototype `screens/G2.tsx` με isClient, `g2-strip.ts`).
// Τα Παραδοτέα έρχονται από την όψη πελάτη της βάσης· η Παραγωγή δεν δίνει στον πελάτη Παραδοτέα ούτε Εργασίες.

const OPEN_FILMING_STATES = ["pending", "scheduled"];

// Η λωρίδα του πελάτη: χωρίς «Ανοιχτές εργασίες».
export const clientProductionStats = (
  progress: ClientProgress,
  filmings: readonly ProductionFilming[],
): StatProps[] => [
  {
    label: "Παραδοτέα",
    value: `${progress.approved}/${progress.total}`,
    hint: "εγκεκριμένα",
  },
  { label: "Γυρίσματα", value: String(filmings.length) },
];

// Τι λείπει για να γίνει παραδομένη μόνη της, με ό,τι βλέπει ο πελάτης (ίδιος κανόνας με το deliveryBlockers της ομάδας).
export const clientBlockers = (
  progress: ClientProgress,
  filmings: readonly ProductionFilming[],
): string[] => {
  const notApproved = progress.total - progress.approved;
  const openFilmings = filmings.filter((filming) =>
    OPEN_FILMING_STATES.includes(filming.state),
  ).length;
  return [
    ...(progress.total === 0 ? ["δεν υπάρχει ακόμα Παραδοτέο"] : []),
    ...(notApproved > 0 ? [`${notApproved} Παραδοτέα δεν έχουν εγκριθεί`] : []),
    ...(openFilmings > 0 ? [`${openFilmings} ανοιχτά Γυρίσματα`] : []),
  ];
};

export interface ClientProvisionRow {
  kindId: string;
  label: string;
  total: number;
  used: number;
  left: number;
}

// Όπως η παλιά G2 πελάτη: «χρησιμοποιήθηκαν» = καταναλωμένα + δεσμευμένα, «απομένουν» = το υπόλοιπο της βάσης.
export const clientProvisionRowsOf = (
  balances: readonly PeriodBalance[],
): ClientProvisionRow[] =>
  balances.map((balance) => ({
    kindId: balance.kindId,
    label: balance.label,
    total: balance.given + balance.carried,
    used: balance.used + balance.reserved,
    left: Math.max(0, balance.balance),
  }));

export const clientProvisionSub = (row: ClientProvisionRow): string =>
  `σύνολο ${row.total} · χρησιμοποιήθηκαν ${row.used} · απομένουν ${row.left}`;
