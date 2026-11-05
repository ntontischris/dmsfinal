// Η πρόταση κάτω από τον τίτλο της Σήμερα (#241 Σ1): σταθερές φράσεις με αριθμούς της βάσης.
// Κάθε κομμάτι μόνο αν ο Χρήστης έχει την κάρτα του (null = λείπει η κάρτα ή ο αριθμός → λείπει η φράση).

import { countWord } from "./a1-model";
import type { ProgrammeDay } from "./a1-programme";

export interface LeadParts {
  filming: { day: ProgrammeDay; count: number } | null;
  decisions: number | null;
  overdue: number | null;
}

const DAY_WORD: Readonly<Record<ProgrammeDay, string>> = {
  today: "Σήμερα",
  tomorrow: "Αύριο",
};

const filmingOf = ({ day, count }: NonNullable<LeadParts["filming"]>) =>
  count === 0
    ? `${DAY_WORD[day]} δεν έχεις Γύρισμα.`
    : `${DAY_WORD[day]} έχεις ${countWord(count, "Γύρισμα", "Γυρίσματα")}.`;

const decisionsOf = (count: number): string =>
  count === 0
    ? "Καμία απόφαση δεν περιμένει εσένα."
    : count === 1
      ? "1 απόφαση περιμένει μόνο εσένα."
      : `${count} αποφάσεις περιμένουν μόνο εσένα.`;

const overdueOf = (count: number): string =>
  count === 0
    ? "Κανένα ληξιπρόθεσμο Τιμολόγιο."
    : `${countWord(count, "ληξιπρόθεσμο Τιμολόγιο", "ληξιπρόθεσμα Τιμολόγια")}.`;

export const leadOf = ({ filming, decisions, overdue }: LeadParts): string =>
  [
    filming && filmingOf(filming),
    decisions !== null && decisionsOf(decisions),
    overdue !== null && overdueOf(overdue),
  ]
    .filter(Boolean)
    .join(" ");
