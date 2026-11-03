import { athensDate, athensTime, formatDate } from "@/modules/filming";
import { hrefOf } from "@/spaces/data/screens";

import type { BlockedConflict, ConflictLine } from "./types";

// Η προειδοποίηση της φόρμας A6: κάθε Γύρισμα που τέμνει τον κλεισμένο χρόνο γίνεται γραμμή με τίτλο, ώρα και σύνδεσμο E3.
// Καθαρή συνάρτηση· την καλεί ο server, ώστε η φόρμα να παίρνει έτοιμο κείμενο.

const NO_TITLE = "Γύρισμα";

// Ώρα Ελλάδας σε 24ωρο: «05/01/2027, 09:00».
const momentOf = (instant: string): string =>
  `${formatDate(instant)}, ${athensTime(instant)}`;

// Ίδια μέρα: «05/01/2027, 09:00–11:00»· αλλιώς και οι δύο στιγμές ολόκληρες.
const whenOf = (startsAt: string, endsAt: string): string =>
  athensDate(startsAt) === athensDate(endsAt)
    ? `${momentOf(startsAt)}–${athensTime(endsAt)}`
    : `${momentOf(startsAt)} – ${momentOf(endsAt)}`;

export const conflictLineOf = (conflict: BlockedConflict): ConflictLine => ({
  id: conflict.id,
  title: conflict.title ?? NO_TITLE,
  when: whenOf(conflict.startsAt, conflict.endsAt),
  href: hrefOf("E3", { id: conflict.id }),
});
