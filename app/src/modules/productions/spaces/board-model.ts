import type { ProductionCard, ProductionStage } from "../types";

// Ο πίνακας Σταδίων (G1, «Πίνακας»): μία στήλη ανά ενεργό Στάδιο, με τη σειρά του διαχειριστή, και στο τέλος «Χωρίς στάδιο».
// Παραγωγή σε Στάδιο που απενεργοποιήθηκε πέφτει κι αυτή στο «Χωρίς στάδιο», για να μη χαθεί από τον πίνακα.

export const NO_STAGE = "Χωρίς στάδιο";

export interface BoardColumn {
  stageId: string | null;
  label: string;
  cards: ProductionCard[];
}

export function boardColumnsOf(
  cards: readonly ProductionCard[],
  stages: readonly ProductionStage[],
): BoardColumn[] {
  const active = stages.filter((stage) => stage.isActive);
  const activeIds = new Set(active.map((stage) => stage.id));
  const columns: BoardColumn[] = active.map((stage) => ({
    stageId: stage.id,
    label: stage.label,
    cards: cards.filter((card) => card.stage?.id === stage.id),
  }));
  const loose = cards.filter(
    (card) => !card.stage || !activeIds.has(card.stage.id),
  );
  return [...columns, { stageId: null, label: NO_STAGE, cards: loose }];
}

// Οι λειτουργίες της σελίδας Παραγωγών: λίστα (προεπιλογή), πίνακας Σταδίων, φόρτος ανά άτομο.
export type G1Mode = "list" | "board" | "load";

export const parseMode = (
  value: string | undefined,
  canSeeLoad: boolean,
): G1Mode => {
  if (value === "board") return "board";
  if (value === "load" && canSeeLoad) return "load";
  return "list";
};
