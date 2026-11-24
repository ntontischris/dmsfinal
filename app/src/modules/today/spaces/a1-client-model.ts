import { countWord, type CardContent, type CardDef } from "./a1-model";

// Η κλειστή κάρτα του Πελάτη: τι γράφει κάτω από τον τίτλο και πότε ανοίγει μόνη της.

// Οι ήπιες κάρτες (ζητούν κάτι από πελάτη) δεν βάφονται κόκκινες.
export const urgentRowsOf = (card: CardDef, content: CardContent): number =>
  card.isGentle ? 0 : content.rows.filter((row) => row.isUrgent).length;

// Μία φράση από τα ίδια τα δεδομένα· το «Τίποτα…» μόνο όταν πράγματι δεν υπάρχει τίποτα.
export const footOf = (card: CardDef, content: CardContent): string => {
  if (content.count === 0 && content.rows.length === 0)
    return content.emptyText;
  const urgent = urgentRowsOf(card, content);
  if (urgent > 0) return countWord(urgent, "επείγον", "επείγοντα");
  return content.rows[0]?.label ?? `${content.count} σε αναμονή`;
};

// Κλειστή εξ ορισμού· ανοιχτή μόνο όταν κάτι επείγει.
export const isOpenOf = (card: CardDef, content: CardContent): boolean =>
  urgentRowsOf(card, content) > 0;
