// A1: οι κάρτες σε ζώνες, για να φαίνεται πρώτα ό,τι καίει.
// Η σειρά του Χρήστη κρατιέται μέσα σε κάθε ζώνη.

import type { CardContent, CardDef, CardRow } from "./a1-model";

interface BuiltCard {
  card: CardDef;
  content: CardContent;
}

export interface Zones<T extends BuiltCard> {
  urgent: readonly T[];
  waiting: readonly T[];
  info: readonly T[];
  // Τεχνικές κάρτες χωρίς πρόβλημα (Διαγραφές Google): κλειστές στο «Περισσότερα». Η Υγεία φαίνεται πάντα.
  more: readonly T[];
}

const isRed = ({ card, content }: BuiltCard): boolean =>
  !card.isGentle && content.rows.some((row) => row.isUrgent);

const zoneOf = (item: BuiltCard): keyof Zones<BuiltCard> => {
  if (isRed(item)) return "urgent";
  if (item.card.isTechnical) return "more";
  return item.card.kind === "action" ? "waiting" : "info";
};

// Σύνδεσμος σε συγκεκριμένο στοιχείο (με ?id=… κ.λπ.)· οι γενικοί σύνδεσμοι λίστας δεν μετρούν ως επανάληψη.
const keyOf = (href: string): string | null =>
  href.includes("?") ? href : null;

const recount = (content: CardContent, kept: readonly CardRow[]): number =>
  content.count === content.rows.length ? kept.length : content.count;

// Κάθε στοιχείο μία φορά στη σελίδα: ό,τι έγινε Τώρα ή φάνηκε σε προηγούμενη κάρτα δεν ξαναφαίνεται.
// Κάρτα που άδειασε έτσι φεύγει, γιατί όλα της φαίνονται ήδη πιο πάνω.
export function withoutRepeats<T extends BuiltCard>(
  items: readonly T[],
  now: Pick<CardRow, "href" | "label"> | null,
): readonly T[] {
  const seen = new Set<string>();
  const isNow = (row: CardRow) =>
    now !== null && row.href === now.href && row.label === now.label;
  return items.flatMap((item) => {
    const { content } = item;
    // Και κάρτα με δικό της κουμπί (Χάρτης): το κουμπί μπαίνει δίπλα στο Τώρα, όχι σε δεύτερη κάρτα.
    const kept = content.rows.filter((row) => {
      const key = keyOf(row.href);
      return !isNow(row) && (key === null || !seen.has(key));
    });
    content.rows.forEach((row) => {
      const key = keyOf(row.href);
      if (key) seen.add(key);
    });
    if (kept.length === content.rows.length) return [item];
    const count = recount(content, kept);
    if (kept.length === 0 && count === 0) return [];
    return [{ ...item, content: { ...content, rows: kept, count } }];
  });
}

export function zonesOf<T extends BuiltCard>(items: readonly T[]): Zones<T> {
  const pick = (zone: keyof Zones<T>) =>
    items.filter((item) => zoneOf(item) === zone);
  return {
    urgent: pick("urgent"),
    waiting: pick("waiting"),
    info: pick("info"),
    more: pick("more"),
  };
}

// Πάνω φαίνονται έως 3 επείγοντα, για να ξεχωρίζει το σημαντικό· τα υπόλοιπα σε κλειστή ενότητα.
export const URGENT_SHOWN = 3;

export const splitUrgent = <T>(
  urgent: readonly T[],
): { shown: readonly T[]; rest: readonly T[] } => ({
  shown: urgent.slice(0, URGENT_SHOWN),
  rest: urgent.slice(URGENT_SHOWN),
});
