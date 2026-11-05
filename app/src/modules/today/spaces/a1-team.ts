// «Η ομάδα» (#241 Σ5): μία γραμμή για όποιον κόλλησε, από το today_team. Σταθερές φράσεις, σωστός αριθμός.

import type { BadgeTone } from "@/spaces/screens/shared";

import type { TeamPerson } from "../view-schema";
import { daysWord } from "./a1-facts";
import { countWord } from "./a1-model";

export const teamLineOf = ({
  late,
  oldestDays,
  steps,
  versions,
}: TeamPerson): string =>
  [
    late > 0 &&
      `${countWord(late, "εκπρόθεσμο Παραδοτέο", "εκπρόθεσμα Παραδοτέα")}${
        oldestDays ? ` (το παλαιότερο ${daysWord(oldestDays)})` : ""
      }`,
    steps > 0 &&
      countWord(steps, "Επόμενο βήμα έληξε", "Επόμενα βήματα έληξαν"),
    versions > 0 &&
      countWord(
        versions,
        "Έκδοση περιμένει έλεγχο",
        "Εκδόσεις περιμένουν έλεγχο",
      ),
  ]
    .filter(Boolean)
    .join(" · ");

// «πίσω»: κάτι έληξε· «ουρά»: μόνο Εκδόσεις που περιμένουν.
export const teamPillOf = ({
  late,
  steps,
}: TeamPerson): { label: string; tone: BadgeTone } =>
  late + steps > 0
    ? { label: "πίσω", tone: "attention" }
    : { label: "ουρά", tone: "waiting" };

// Οι υπόλοιποι της ομάδας. «άτομο» για τον έναν: ουδέτερο, χωρίς να μαντεύουμε φύλο.
export const teamFineOf = (stuck: number, fine: number): string | null => {
  if (fine === 0) return null;
  if (stuck === 0)
    return fine === 1
      ? "Κανείς δεν κόλλησε. Το 1 άτομο της ομάδας είναι στην ώρα του."
      : `Κανείς δεν κόλλησε. Και οι ${fine} της ομάδας είναι στην ώρα τους.`;
  return fine === 1
    ? "1 ακόμα άτομο της ομάδας είναι στην ώρα του."
    : `Οι άλλοι ${fine} της ομάδας είναι στην ώρα τους.`;
};
