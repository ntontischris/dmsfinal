import { awaitingFirst } from "../client-helpers";
import type {
  ClientDeliverableCard,
  ClientDeliverableState,
  ClientDeliverablesView,
  ClientPeriodGroup,
  ClientProvision,
} from "../client-types";

// Από την όψη πελάτη της βάσης (client_deliverables_view) στη μορφή του prototype `screens/h3-model.ts`.

// Οι λέξεις του prototype για τον πελάτη: «αναμένει πελάτη» γίνεται «περιμένει εσένα».
export const CLIENT_WORDS: Readonly<Record<ClientDeliverableState, string>> = {
  in_progress: "σε εργασία",
  awaiting_you: "περιμένει εσένα",
  changes_requested: "ζητήθηκαν αλλαγές",
  approved: "εγκρίθηκε",
  cancelled: "ακυρώθηκε",
};

// Χωρίς Όριο αλλαγών στη Συμφωνία φαίνεται μόνο πόσοι γύροι έγιναν.
export const roundsLabel = (used: number, limit: number | null): string =>
  limit === null
    ? `γύροι αλλαγών: ${used}`
    : `γύροι αλλαγών: ${used} από ${limit}`;

export const rowSubOf = (card: ClientDeliverableCard): string =>
  `${card.kind} · ${roundsLabel(card.roundsUsed, card.roundsLimit)}`;

export interface CounterRow {
  label: string;
  total: number;
  used: number;
  left: number;
}

export const counterOf = (provision: ClientProvision): CounterRow => ({
  label: provision.kind,
  total: provision.total,
  used: provision.used,
  left: provision.remaining,
});

export interface H3Group {
  key: string;
  label: string;
  rows: readonly CounterRow[];
  deliverables: readonly ClientDeliverableCard[];
}

// Όπως στη σημερινή σελίδα: φαίνονται και οι Περίοδοι χωρίς Παραδοτέα (με τους μετρητές τους). Η σειρά είναι της βάσης.
export const groupsOf = (view: ClientDeliverablesView): readonly H3Group[] =>
  view.periods.map((group: ClientPeriodGroup) => ({
    key: group.periodId ?? group.periodLabel,
    label: group.periodLabel,
    rows: group.provisions.map(counterOf),
    deliverables: group.deliverables,
  }));

// «Περιμένουν εσένα»: όποιο περιμένει περισσότερο, πρώτο.
export const waitingOf = (
  view: ClientDeliverablesView,
): readonly ClientDeliverableCard[] => awaitingFirst(view.awaitingYou);

export const countWord = (count: number, one: string, many: string): string =>
  count === 1 ? one : many;
