// «Νέο από την τελευταία φορά» και «Αργότερα» (#241 Σ8) στο «Μόνο εσύ μπορείς». Καθαρές συναρτήσεις: τι ήρθε μετά την
// προηγούμενη επίσκεψη (today_mark_seen) και ποιες αποφάσεις κρύβονται ως αύριο το πρωί (today_snoozed).

import type { Built } from "./a1-adapter";
import type { CardRow } from "./a1-model";

// Το κλειδί του «Αργότερα»: κωδικός κάρτας + ':' + id της γραμμής. Χωρίς id η γραμμή δεν κρύβεται.
export const itemKeyOf = (cardId: string, row: CardRow): string | null =>
  row.id ? `${cardId}:${row.id}` : null;

const keysOf = (
  { card, content }: Built,
  snoozed: ReadonlySet<string>,
): readonly string[] =>
  content.rows
    .map((row) => itemKeyOf(card.id, row))
    .filter((key): key is string => key !== null && snoozed.has(key));

export interface WithoutLater {
  cards: readonly Built[];
  // Τα κλειδιά που κρύφτηκαν από τις γραμμές που φορτώθηκαν (για το «N για αργότερα» και την Αναίρεση).
  later: readonly string[];
}

// Οι κρυμμένες γραμμές βγαίνουν από τη λίστα και από το πλήθος της κάρτας (άρα και από την πρόταση της κορυφής).
export function withoutLater(
  cards: readonly Built[],
  snoozed: readonly string[],
): WithoutLater {
  const keys = new Set(snoozed);
  const kept = cards.map((built) => {
    const hidden = new Set(keysOf(built, keys));
    return {
      card: built.card,
      content: {
        ...built.content,
        count: Math.max(0, built.content.count - hidden.size),
        rows: built.content.rows.filter(
          (row) => !hidden.has(itemKeyOf(built.card.id, row) ?? ""),
        ),
      },
    };
  });
  return { cards: kept, later: cards.flatMap((built) => keysOf(built, keys)) };
}

// «Νέο»: ζητήθηκε (waitingSince, αλλιώς at) μετά την προηγούμενη επίσκεψη. Πρώτη επίσκεψη (null): τίποτα δεν είναι «νέο».
export const isNewSince = (row: CardRow, seenAt: string | null): boolean => {
  if (seenAt === null) return false;
  const since = Date.parse(row.waitingSince ?? row.at ?? "");
  return Number.isFinite(since) && since > Date.parse(seenAt);
};

export const newCountOf = (
  cards: readonly Built[],
  seenAt: string | null,
): number =>
  cards.reduce(
    (sum, { content }) =>
      sum + content.rows.filter((row) => isNewSince(row, seenAt)).length,
    0,
  );

// Το σήμα δίπλα στην ημερομηνία: «3 νέα από την τελευταία φορά».
export const newChipOf = (count: number): string | null =>
  count === 0
    ? null
    : `${count} ${count === 1 ? "νέο" : "νέα"} από την τελευταία φορά`;

// Η ήσυχη γραμμή κάτω από τη λίστα. stamp: «ΕΕΕΕ-ΜΜ-ΗΗTΩΩ:ΛΛ» Αθήνας· πριν από τις 08:00 ξαναβγαίνουν σήμερα στις 8.
export const laterLineOf = (count: number, stamp: string): string | null => {
  if (count === 0) return null;
  const when =
    Number(stamp.slice(11, 13)) < 8 ? "στις 8 το πρωί" : "αύριο το πρωί";
  return `${count} για αργότερα · ${count === 1 ? "ξαναβγαίνει" : "ξαναβγαίνουν"} ${when}`;
};
