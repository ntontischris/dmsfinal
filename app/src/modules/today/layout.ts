import type { TodayCard } from "./view-schema";

// Η διάταξη της «Σήμερα» (κανόνες 4, 8, 10): από τα πλήθη και τις Προτιμήσεις, ποιες κάρτες φαίνονται,
// ποιες μαζεύονται στη γραμμή «✓ Τίποτα σε αναμονή» και αν η σελίδα είναι «Όλα καθαρά».

export interface TodayLayout {
  visible: readonly TodayCard[];
  quiet: readonly TodayCard[];
  isAllClear: boolean;
  isAllHidden: boolean;
}

// Κάτι περιμένει: πλήθος πάνω από 0, ή η κάρτα απέτυχε να μετρήσει (η δική της φόρτωση δείχνει «Ξαναδοκίμασε»).
export const isWaiting = (card: TodayCard): boolean =>
  card.failed || (card.count ?? 0) > 0;

export function arrangeToday(cards: readonly TodayCard[]): TodayLayout {
  const shown = cards.filter((card) => !card.hidden);
  const health = shown.filter((card) => card.kind === "health");
  const rest = shown.filter((card) => card.kind !== "health");
  const isAllHidden = cards.length > 0 && shown.length === 0;
  return {
    // Η Υγεία πάντα πρώτη· η εβδομάδα πάντα· η κάρτα ενέργειας μόνο όταν κάτι περιμένει.
    visible: [
      ...health,
      ...rest.filter((card) => card.kind === "week" || isWaiting(card)),
    ],
    quiet: rest.filter((card) => card.kind === "action" && !isWaiting(card)),
    isAllClear:
      !isAllHidden &&
      !shown.some((card) => card.kind !== "week" && isWaiting(card)),
    isAllHidden,
  };
}
