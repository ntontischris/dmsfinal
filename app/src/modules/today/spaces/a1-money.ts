// «Χρήματα» (#241 Σ4): σταθερές φράσεις από το today_money. Κανένα ποσό που δεν έδωσε η βάση.

import type { TodayMoney } from "../view-schema";
import { wholeEuros } from "./a1-facts";
import { countWord } from "./a1-model";

const MONTHS = [
  "Ιανουάριος",
  "Φεβρουάριος",
  "Μάρτιος",
  "Απρίλιος",
  "Μάιος",
  "Ιούνιος",
  "Ιούλιος",
  "Αύγουστος",
  "Σεπτέμβριος",
  "Οκτώβριος",
  "Νοέμβριος",
  "Δεκέμβριος",
] as const;

// «3.940 € ληξιπρόθεσμα · 6 τιμολόγια»: το μεγάλο ποσό και η γραμμή δίπλα του.
export const overdueTotalOf = (money: TodayMoney) => ({
  amount: wholeEuros(money.overdueCents),
  detail:
    money.overdueCount === 0
      ? "κανένα ληξιπρόθεσμο"
      : `ληξιπρόθεσμα · ${countWord(money.overdueCount, "τιμολόγιο", "τιμολόγια")}`,
});

// Η φράση της κορυφής (Σ1): «Ληξιπρόθεσμα 3.940 € από 3 πελάτες.»
export const overdueLeadOf = (money: TodayMoney): string =>
  money.overdueCount === 0
    ? "Κανένα ληξιπρόθεσμο Τιμολόγιο."
    : `Ληξιπρόθεσμα ${wholeEuros(money.overdueCents)} από ${countWord(money.clientCount, "πελάτη", "πελάτες")}.`;

export interface Pace {
  sentence: string;
  // 0–1: πόσο από τα Τιμολόγια που λήγουν τον μήνα εξοφλήθηκε, και πού θα έπρεπε να είμαστε σήμερα (μέρα / μέρες του μήνα).
  share: number;
  shouldBe: number;
  // Μόνο όταν λήγει κάτι τον μήνα (expected > 0).
  verdict: string | null;
}

export const paceOf = ({ month }: TodayMoney): Pace => {
  const shouldBe = month.day / month.days;
  const share =
    month.expectedCents > 0
      ? Math.min(1, month.collectedCents / month.expectedCents)
      : 0;
  return {
    sentence:
      month.expectedCents > 0
        ? `${MONTHS[month.month - 1]}: μπήκαν ${wholeEuros(month.collectedCents)} από ${wholeEuros(month.expectedCents)} που λήγουν αυτόν τον μήνα.`
        : `${MONTHS[month.month - 1]}: δεν λήγει κανένα Τιμολόγιο αυτόν τον μήνα.`,
    share,
    shouldBe,
    verdict:
      month.expectedCents > 0
        ? share >= shouldBe
          ? "Μπροστά από τον ρυθμό του μήνα."
          : "Πίσω από τον ρυθμό του μήνα."
        : null,
  };
};

// Οι μπάρες των οφειλετών, ανάλογες με τον μεγαλύτερο (0–100).
export const barsOf = (amounts: readonly number[]): readonly number[] => {
  const largest = Math.max(0, ...amounts);
  return amounts.map((amount) =>
    largest > 0 ? Math.round((amount / largest) * 100) : 0,
  );
};
