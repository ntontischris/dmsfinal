import { countStat } from "@/spaces/kit/count-stat";
import type { StatProps } from "@/spaces/kit/panel";

import type { ProductionCard } from "../types";
import type { G1Signals } from "./g1-rows";

// Τα τρία χοντρά της καρτέλας Παραγωγές: ώρες που λείπουν, κόστος που ξέφυγε, Παραδοτέα που περιμένουν έλεγχο.
// Όποια κάρτα ο θεατής δεν δικαιούται (κόστος, έλεγχος) δεν μπαίνει.

interface StripInput {
  cards: readonly ProductionCard[];
  signals: G1Signals;
  canSeeCost: boolean;
  canReview: boolean;
}

const sum = (values: Iterable<number>): number =>
  [...values].reduce((total, value) => total + value, 0);

const costStats = ({ cards, signals }: StripInput): StatProps[] => [
  countStat(
    {
      label: "Θέλουν ώρες",
      hint: "χωρίς καταχωρημένες ώρες",
      href: "/app/productions?view=hours",
    },
    cards.filter((card) => signals.needsHours.has(card.id)).length,
  ),
  countStat(
    {
      label: "Υπέρβαση κόστους",
      hint: "πέρασαν τον προϋπολογισμό",
      href: "/app/productions/costs",
    },
    cards.filter((card) => signals.overrun.has(card.id)).length,
  ),
];

const reviewStat = ({ signals }: StripInput): StatProps =>
  countStat(
    {
      label: "Προς έλεγχο",
      hint: "Παραδοτέα που περιμένουν έλεγχο",
      href: "/app/deliverables?view=review",
    },
    sum(signals.inReview.values()),
  );

export const productionsStripOf = (input: StripInput): readonly StatProps[] => [
  ...(input.canSeeCost ? costStats(input) : []),
  ...(input.canReview ? [reviewStat(input)] : []),
];
