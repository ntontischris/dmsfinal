import { fmtDate } from "@/spaces/screens/shared";

import { periodLabel } from "../helpers";
import { NO_OWNER_LABEL } from "../labels";
import type { ProductionCard, ProductionState } from "../types";

// Οι γραμμές της λίστας Παραγωγών (prototype `screens/g1-rows.ts`) από τις πραγματικές κάρτες της βάσης.
// Τα σήματα έρχονται από άλλες αναγνώσεις (Γυρίσματα, Παραδοτέα, Κόστος) ως σύνολα ανά Παραγωγή· καθαρές συναρτήσεις.

export interface G1Row {
  id: string;
  title: string;
  client: string;
  period: string;
  owner: string;
  nextFilming: string;
  state: string;
  inReview: number;
  needsHours: boolean;
  overrun: boolean;
}

// Ό,τι ξέρουμε για κάθε Παραγωγή πέρα από την κάρτα της. Κενό = δεν φορτώθηκε ή δεν το δικαιούσαι.
export interface G1Signals {
  nextFilming: ReadonlyMap<string, string>; // Παραγωγή → ημέρα (YYYY-MM-DD, Αθήνα) του επόμενου Γυρίσματος
  inReview: ReadonlyMap<string, number>; // Παραγωγή → Παραδοτέα προς έλεγχο
  needsHours: ReadonlySet<string>;
  overrun: ReadonlySet<string>;
}

export const NO_SIGNALS: G1Signals = {
  nextFilming: new Map(),
  inReview: new Map(),
  needsHours: new Set(),
  overrun: new Set(),
};

// Οι λέξεις κατάστασης του prototype.
export const STATE_WORDS: Readonly<Record<ProductionState, string>> = {
  open: "ανοιχτή",
  delivered: "παραδομένη",
  cancelled: "ακυρωμένη",
};

export type View = "open" | "hours" | "delivered" | "internal" | "all";

export const VIEWS: readonly { id: View; label: string }[] = [
  { id: "open", label: "Ανοιχτές" },
  { id: "hours", label: "Θέλουν ώρες" },
  { id: "delivered", label: "Παραδομένες" },
  { id: "internal", label: "Εσωτερικές" },
  { id: "all", label: "Όλες" },
];

// Η προβολή από τη διεύθυνση: ?view= του prototype, ή τα ?tab=/&internal=1 της παλιάς εμφάνισης (σύνδεσμοι που υπάρχουν ήδη).
export const parseView = (query: {
  view?: string;
  tab?: string;
  internal?: string;
}): View => {
  const named = VIEWS.find((view) => view.id === query.view)?.id;
  if (named) return named;
  if (query.internal === "1") return "internal";
  return VIEWS.find((view) => view.id === query.tab)?.id ?? "open";
};

export const matches = (
  view: View,
  card: ProductionCard,
  signals: G1Signals,
): boolean => {
  switch (view) {
    case "open":
      return card.state === "open";
    case "hours":
      return signals.needsHours.has(card.id);
    case "delivered":
      return card.state === "delivered";
    case "internal":
      return card.isInternal;
    case "all":
      return true;
  }
};

// «Θέλουν ώρες» μόνο για όσους βλέπουν κόστος.
export const visibleViews = (canSeeCost: boolean) =>
  VIEWS.filter((view) => view.id !== "hours" || canSeeCost);

// Η βάση δίνει τη νεότερη πρώτη. Ανοιχτές: αρχή Περιόδου αύξουσα, και χωρίς Περίοδο με τη σειρά δημιουργίας (παλαιότερη πρώτη).
// Οι υπόλοιπες μένουν νεότερη πρώτη (η ημερομηνία παράδοσης δεν έρχεται στη λίστα).
export const sortFor = (
  view: View,
  list: readonly ProductionCard[],
): ProductionCard[] => {
  if (view !== "open") return [...list];
  const oldestFirst = [...list].reverse();
  return oldestFirst
    .map((card, index) => ({ card, key: card.period?.starts ?? "", index }))
    .sort((a, b) => a.key.localeCompare(b.key) || a.index - b.index)
    .map((entry) => entry.card);
};

// Φίλτρο από τη διεύθυνση (?client=), π.χ. από τη Σελίδα Πελάτη.
export const ofClient = (
  list: readonly ProductionCard[],
  clientId: string | undefined,
): readonly ProductionCard[] =>
  clientId ? list.filter((card) => card.client?.id === clientId) : list;

const periodLabelOf = (card: ProductionCard): string =>
  card.period
    ? periodLabel(card.period.starts)
    : card.isInternal
      ? "εσωτερική"
      : "εφάπαξ";

export const toRow = (card: ProductionCard, signals: G1Signals): G1Row => {
  const next = signals.nextFilming.get(card.id);
  return {
    id: card.id,
    title: card.title,
    client: card.client?.name ?? "Εσωτερική",
    period: periodLabelOf(card),
    owner: card.owner?.name ?? NO_OWNER_LABEL,
    nextFilming: next ? fmtDate(next) : "—",
    state: STATE_WORDS[card.state],
    inReview: signals.inReview.get(card.id) ?? 0,
    needsHours: signals.needsHours.has(card.id),
    overrun: signals.overrun.has(card.id),
  };
};

// Το επόμενο Γύρισμα ανά Παραγωγή: το νωρίτερο ανοιχτό από τώρα και μετά (η στιγμή του, ISO).
export const nextFilmingsOf = (
  filmings: readonly { startsAt: string; production: { id: string } }[],
  nowIso: string,
): Map<string, string> => {
  const now = Date.parse(nowIso);
  const next = new Map<string, string>();
  for (const filming of filmings) {
    const at = Date.parse(filming.startsAt);
    if (at < now) continue;
    const current = next.get(filming.production.id);
    if (!current || at < Date.parse(current))
      next.set(filming.production.id, filming.startsAt);
  }
  return next;
};

// Πόσα Παραδοτέα περιμένουν έλεγχο ανά Παραγωγή.
export const countByProduction = (
  cards: readonly { productionId: string }[],
): Map<string, number> => {
  const counts = new Map<string, number>();
  for (const card of cards)
    counts.set(card.productionId, (counts.get(card.productionId) ?? 0) + 1);
  return counts;
};
