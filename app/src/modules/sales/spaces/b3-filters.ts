// Φίλτρα του Pipeline (prototype `screens/b3-filters.ts`): ποιον παίρνω αυτή την εβδομάδα, ποιος ξεχάστηκε, με ποιον
// χάθηκε η επαφή.

export type BoardFilter = "all" | "week" | "forgotten" | "quiet";

export interface FilterCard {
  nextStepDue: string | null;
  lastContact: string | null;
  isForgotten: boolean;
}

// Πάνω από τόσες μέρες χωρίς Δραστηριότητα, η Ευκαιρία θεωρείται «χωρίς επαφή».
export const QUIET_DAYS = 14;
const WEEK_DAYS = 7;
const MS_PER_DAY = 86_400_000;

export const daysSince = (iso: string, today: string): number =>
  Math.round((Date.parse(today.slice(0, 10)) - Date.parse(iso.slice(0, 10))) / MS_PER_DAY);

export const cardMatches = (
  card: FilterCard,
  filter: BoardFilter,
  today: string,
): boolean => {
  if (filter === "forgotten") return card.isForgotten;
  if (filter === "quiet")
    return card.lastContact === null || daysSince(card.lastContact, today) > QUIET_DAYS;
  if (filter === "week") {
    if (!card.nextStepDue) return false;
    const ahead = -daysSince(card.nextStepDue, today);
    return ahead >= 0 && ahead <= WEEK_DAYS;
  }
  return true;
};
