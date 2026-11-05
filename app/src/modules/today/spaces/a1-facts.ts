// Οι φράσεις κάθε απόφασης (#241 Σ7): σταθερές προτάσεις μόνο με δεδομένα της βάσης· λείπει ο αριθμός → λείπει η φράση.
// Ποτέ «χάνεται η θέση»: οι κρατήσεις δεν λήγουν. Οι μέρες είναι μέρες Ελλάδας (athensStamp).

import { athensStamp } from "./a1-adapter";
import type { CardRow } from "./a1-model";
import { weekdayOf } from "./a1-programme";

const DAY_MS = 86_400_000;

const EUROS = new Intl.NumberFormat("el-GR", {
  style: "currency",
  currency: "EUR",
  maximumFractionDigits: 0,
});

// Ποσό σε ακέραια ευρώ: «3.940 €».
export const wholeEuros = (cents: number): string =>
  EUROS.format(Math.round(cents / 100));

export const daysWord = (days: number): string =>
  days === 1 ? "1 ημέρα" : `${days} ημέρες`;

const athensDateOf = (iso: string): string | null => {
  const time = Date.parse(iso);
  return Number.isNaN(time) ? null : athensStamp(new Date(time)).slice(0, 10);
};

// Οι μέρες ανάμεσα σε δύο ημερομηνίες «ΕΕΕΕ-ΜΜ-ΗΗ».
const daysBetween = (from: string, to: string): number =>
  Math.round((Date.parse(`${to}T12:00Z`) - Date.parse(`${from}T12:00Z`)) / DAY_MS);

export const waitingOf = (
  since: string | undefined,
  today: string,
): string | null => {
  const day = since ? athensDateOf(since) : null;
  if (!day) return null;
  const days = Math.max(0, daysBetween(day, today));
  return days === 0 ? "Περιμένει από σήμερα." : `Περιμένει ${daysWord(days)}.`;
};

// «Τρίτη 10/11, 17:00.»
const slotOf = (iso: string): string | null => {
  const time = Date.parse(iso);
  if (Number.isNaN(time)) return null;
  const stamp = athensStamp(new Date(time));
  const date = stamp.slice(0, 10);
  return `${weekdayOf(date)} ${Number(date.slice(8, 10))}/${Number(date.slice(5, 7))}, ${stamp.slice(11, 16)}.`;
};

const sentenceOf = (text: string): string => {
  const trimmed = text.trim();
  // toUpperCase, όχι toLocaleUpperCase("el"): το δεύτερο σβήνει τον τόνο («ά» → «Α»).
  const capital = trimmed.charAt(0).toUpperCase() + trimmed.slice(1);
  return /[.!;]$/.test(capital) ? capital : `${capital}.`;
};

type FactRow = Pick<
  CardRow,
  "amountCents" | "at" | "note" | "waitingSince" | "isSlotFree"
> & { cardId: string };

const leadOf = (row: FactRow): string | null => {
  if (row.cardId === "proposal_approvals")
    return row.amountCents !== undefined
      ? `${wholeEuros(row.amountCents)} με Παρέκκλιση.`
      : "Με Παρέκκλιση.";
  if (row.cardId === "filming_approvals") return row.at ? slotOf(row.at) : null;
  return row.note ? sentenceOf(row.note) : null;
};

export const decisionFactOf = (row: FactRow, today: string): string =>
  [
    leadOf(row),
    waitingOf(row.waitingSince, today),
    row.cardId === "filming_approvals" && row.isSlotFree
      ? "Η ώρα είναι ακόμα ελεύθερη."
      : null,
  ]
    .filter(Boolean)
    .join(" ");
