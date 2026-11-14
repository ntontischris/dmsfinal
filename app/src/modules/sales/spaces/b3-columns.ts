// Κάθε πεδίο της κάρτας του Pipeline και φίλτρο (b1/b3): Υπεύθυνος, Πηγή, Κλείσιμο. Τα «ποιον παίρνω» μένουν στη σειρά
// επιλογών του πίνακα· αυτά εδώ ζουν στη διεύθυνση (?owner=, ?source=, ?close=).

import {
  selectionOf,
  type ColumnFilter,
  type ColumnValue,
} from "@/spaces/kit/column-filters";
import { hrefOf } from "@/spaces/data/screens";

import type { BoardCard } from "./b3-adapter";

export const B3_COLUMN_KEYS = ["owner", "source", "close"] as const;

const one = (value: string, label: string): ColumnValue[] => [{ value, label }];

// Το κλείσιμο σε κλίμακες: πέρασε, αυτόν τον μήνα, αργότερα, χωρίς ημερομηνία. Οι κλεισμένες δεν έχουν.
const closeOf =
  (today: string) =>
  (card: BoardCard): ColumnValue[] => {
    if (card.outcome !== "open") return [];
    if (card.expectedClose === null) return one("none", "Χωρίς ημερομηνία");
    if (card.isLate) return one("late", "Πέρασε");
    return card.expectedClose.slice(0, 7) === today.slice(0, 7)
      ? one("month", "Αυτόν τον μήνα")
      : one("later", "Αργότερα");
  };

export const b3ColumnFilters = (today: string): ColumnFilter<BoardCard>[] => [
  {
    key: "owner",
    label: "Υπεύθυνος",
    isSearchable: true,
    valuesOf: (card) => one(card.owner, card.owner),
  },
  {
    key: "source",
    label: "Πηγή",
    allLabel: "όλες",
    valuesOf: (card) =>
      card.source === "" ? [] : one(card.source, card.source),
  },
  {
    key: "close",
    label: "Κλείσιμο",
    order: ["late", "month", "later", "none"],
    valuesOf: closeOf(today),
  },
];

export const b3Href = (
  selection: Readonly<Record<string, string | undefined>>,
) => hrefOf("B3", { ...selection });

export const parseB3Selection = (
  params: Readonly<Record<string, string | string[] | undefined>>,
) => selectionOf(B3_COLUMN_KEYS, params);
