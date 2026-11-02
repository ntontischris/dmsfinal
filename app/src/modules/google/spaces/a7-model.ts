// A7 (νέα εμφάνιση): οι διαγραφές της βάσης (google_deletions) στο σχήμα του prototype (`screens/a7-model.ts`).
// Καθαρές συναρτήσεις· οι ημερομηνίες έρχονται ήδη μορφοποιημένες από τη σελίδα.

import type { GoogleDeletion } from "../types";

const HOUR_MS = 3_600_000;

export interface DeletionItem {
  id: string;
  title: string;
  filmingHref: string;
  stateLabel: string;
  isAwaitingApproval: boolean;
  detectedAtLabel: string;
  whenLabel: string;
  deadlineLabel: string;
  hoursLeft: number;
  isDeadlineFilmingStart: boolean;
}

export const hoursLeftLabel = (hours: number): string => {
  if (hours <= 0) return "έληξε";
  if (hours < 1) return "σε λιγότερο από 1 ώρα";
  const rounded = Math.round(hours);
  return `σε ${rounded} ${rounded === 1 ? "ώρα" : "ώρες"}`;
};

// Οι διαγραφές αφορούν ανοιχτά Γυρίσματα: «αναμένει έγκριση» ή «προγραμματισμένο».
export const stateLabelOf = (state: string): string =>
  state === "pending" ? "αναμένει έγκριση" : "προγραμματισμένο";

export interface DeletionFormat {
  dateTime: (iso: string) => string;
  filmingHref: (id: string) => string;
}

export const deletionItemOf = (
  deletion: GoogleDeletion,
  nowMs: number,
  format: DeletionFormat,
): DeletionItem => {
  const deadlineMs = Date.parse(deletion.deadlineAt);
  return {
    id: deletion.filmingId,
    title: deletion.title ?? "Γύρισμα",
    filmingHref: format.filmingHref(deletion.filmingId),
    stateLabel: stateLabelOf(deletion.state),
    isAwaitingApproval: deletion.state === "pending",
    detectedAtLabel: format.dateTime(deletion.detectedAt),
    whenLabel: format.dateTime(deletion.startsAt),
    deadlineLabel: `${format.dateTime(deletion.deadlineAt)} · ${hoursLeftLabel((deadlineMs - nowMs) / HOUR_MS)}`,
    hoursLeft: (deadlineMs - nowMs) / HOUR_MS,
    isDeadlineFilmingStart: deadlineMs >= Date.parse(deletion.startsAt),
  };
};
