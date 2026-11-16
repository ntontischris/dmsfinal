import { countStat } from "@/spaces/kit/count-stat";
import type { StatProps } from "@/spaces/kit/panel";

import type { DeliverableCard } from "../types";
import { lateCount } from "./h1-model";

// Τα τρία χοντρά της καρτέλας Παραδοτέα: τα δικά μου, ό,τι καθυστερεί, ό,τι περιμένει έλεγχο.
// Τα «δικά μου» είναι δουλειά, όχι πρόβλημα: μένουν ήσυχα. review=null: ο θεατής δεν ελέγχει, η κάρτα δεν μπαίνει.

interface StripInput {
  work: readonly DeliverableCard[]; // η ουρά «για μένα» όλης της ομάδας
  review: readonly DeliverableCard[] | null;
  viewerId: string | undefined;
}

const reviewStat = (review: readonly DeliverableCard[]): StatProps =>
  countStat(
    {
      label: "Προς έλεγχο",
      hint: "περιμένουν την απόφασή σου",
      href: "/app/deliverables?view=review",
    },
    review.length,
  );

export const deliverablesStripOf = ({
  work,
  review,
  viewerId,
}: StripInput): readonly StatProps[] => [
  countStat(
    {
      label: "Δικά μου",
      hint: "ανατεθειμένα σε εμένα",
      href: "/app/deliverables?who=me",
    },
    work.filter(
      (card) => viewerId !== undefined && card.assigneeId === viewerId,
    ).length,
    false,
  ),
  countStat(
    {
      label: "Καθυστερούν",
      hint: "πέρασε η προθεσμία",
      href: "/app/deliverables?late=1",
    },
    lateCount(work),
  ),
  ...(review === null ? [] : [reviewStat(review)]),
];
