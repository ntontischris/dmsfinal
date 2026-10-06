import {
  NOW,
  OPEN_STATES,
  personName,
  type ProductionStub,
} from "@/data/filming";
import {
  clientNameOfProduction,
  filmingsOf,
  isInternal,
  isOverrun,
  needsHours,
  periodOfProduction,
  progressOf,
  recordOf,
  stateOf,
} from "@/data/productions-access";
import { fmtDate } from "@/screens/shared";

export interface G1Row {
  id: string;
  title: string;
  client: string;
  period: string;
  owner: string;
  deliverables: string;
  nextFilming: string;
  state: string;
  late: number;
  inReview: number;
  needsHours: boolean;
  overrun: boolean;
}

const periodLabelOf = (p: ProductionStub): string =>
  p.periodLabel ?? (isInternal(p) ? "εσωτερική" : "εφάπαξ");

export const nextFilmingOf = (p: ProductionStub): string | null => {
  const dates = filmingsOf(p)
    .filter((f) => OPEN_STATES.includes(f.state) && f.date >= NOW.slice(0, 10))
    .map((f) => f.date)
    .sort();
  return dates[0] ?? null;
};

const deliverablesLabel = (p: ProductionStub): string => {
  const progress = progressOf(p);
  if (progress.total === 0) return "—";
  const base = `${progress.approved}/${progress.total} εγκρίθηκαν`;
  return progress.waitingClient > 0
    ? `${base} · ${progress.waitingClient} στον πελάτη`
    : base;
};

export const toRow = (p: ProductionStub, canSeeCost: boolean): G1Row => {
  const progress = progressOf(p);
  const next = nextFilmingOf(p);
  return {
    id: p.id,
    title: p.title,
    client: clientNameOfProduction(p),
    period: periodLabelOf(p),
    owner: personName(p.ownerId),
    deliverables: deliverablesLabel(p),
    nextFilming: next ? fmtDate(next) : "—",
    state: stateOf(p),
    late: progress.late,
    inReview: progress.inReview,
    needsHours: canSeeCost && needsHours(p),
    overrun: canSeeCost && isOverrun(p),
  };
};

// Κλειδί ταξινόμησης: αρχή Περίοδου, αλλιώς ημερομηνία δημιουργίας.
export const sortKeyOf = (p: ProductionStub): string =>
  periodOfProduction(p)?.starts ?? recordOf(p).createdAt;
