// E1 (νέα εμφάνιση): οι γραμμές της βάσης (filmings_view) στο σχήμα της λίστας του prototype, σε ώρα Αθήνας.
// Καθαρές συναρτήσεις.

import { athensDate, athensTime } from "../helpers-time";
import type { FilmingRow, FilmingTab } from "../types";
import type { E1Filming } from "./e1-groups";

const HOUR_MS = 3_600_000;

export const e1FilmingOf = (row: FilmingRow): E1Filming => {
  const startsAtMs = Date.parse(row.startsAt);
  const endsAtMs = startsAtMs + row.hours * HOUR_MS;
  return {
    id: row.id,
    date: athensDate(row.startsAt),
    start: athensTime(row.startsAt),
    end: athensTime(new Date(endsAtMs).toISOString()),
    startsAtMs,
    endsAtMs,
    state: row.state,
    clientName: row.client?.name ?? null,
    productionTitle: row.production.title,
    crew: row.crew,
    signals: row.signals,
  };
};

export interface E1View {
  id: FilmingTab;
  label: string;
}

// Οι προβολές του prototype, με τις καρτέλες της βάσης (ίδιο ?tab= με την παλιά σελίδα).
export const E1_VIEWS: readonly E1View[] = [
  { id: "open", label: "Ανοιχτά" },
  { id: "week", label: "Επόμενες 7 ημέρες" },
  { id: "pending", label: "Αναμένουν έγκριση" },
  { id: "needs_outcome", label: "Θέλουν «έγινε»" },
  { id: "closed", label: "Έγιναν ή ακυρώθηκαν" },
  { id: "all", label: "Όλα" },
];

// Όποιος έχει την ουρά «Αναμένουν έγκριση» (E2) τη βλέπει ως φίλτρο πάνω από τη λίστα, όχι και εδώ.
// Ο πελάτης έχει όλες τις προβολές, και το «Θέλουν «έγινε»», όπως στη σημερινή σελίδα.
export const visibleViews = (hasQueue: boolean): readonly E1View[] =>
  E1_VIEWS.filter((view) => !(hasQueue && view.id === "pending"));

// Η βάση δίνει έως 100 ανά καρτέλα.
export const LIST_LIMIT = 100;

export const tabCountLabel = (count: number): string =>
  count >= LIST_LIMIT ? `${LIST_LIMIT}+` : String(count);
