import { GenericCard } from "../components/generic-card";
import type { CardRenderer, CardRenderers } from "./types";
import { withDayLabel } from "./work-items";

// Κάρτα με ημερομηνία ανά γραμμή: η γενική κάρτα, με τη μέρα (και το πρόθεμά της) στον υπότιτλο.
const datedCard =
  (prefix: string): CardRenderer =>
  ({ card, data }) =>
    GenericCard({ card, data: { ...data, items: withDayLabel(data.items, prefix) } });

// Κάρτες της ομάδας «Η δουλειά μου». Κάθε κάρτα που θέλει δική της εμφάνιση προστίθεται εδώ (code → renderer)·
// όσες δεν είναι εδώ τις δείχνει η γενική κάρτα.
export const WORK_CARDS: CardRenderers = {
  my_deliverables: datedCard("προθεσμία"),
  versions_to_review: datedCard("προθεσμία"),
  next_steps_due: datedCard("έληξε"),
  proposals_in_progress: datedCard("λήγει"),
};
