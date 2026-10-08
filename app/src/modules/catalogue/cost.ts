import type {
  CatalogueItem,
  CostHint,
  ItemCost,
  ItemMargin,
  Multipliers,
  PriceRange,
} from "./types";

// Η εκτίμηση κόστους και το Εύρος τιμής, καθαρές συναρτήσεις. Η βάση δίνει μόνο τις αποθηκευμένες τιμές·
// το κόστος υπολογίζεται εδώ από τις ώρες του στοιχείου και το Κόστος ώρας που ισχύει σήμερα.

export const roundMoney = (value: number): number =>
  Math.round((value + Number.EPSILON) * 100) / 100;

export const priceRange = (
  estimatedCost: number,
  multipliers: Multipliers,
): PriceRange => ({
  min: roundMoney(estimatedCost * multipliers.min),
  target: roundMoney(estimatedCost * multipliers.target),
  max: roundMoney(estimatedCost * multipliers.max),
});

// Η ελάχιστη τιμή επιτρέπεται: «κάτω από το ελάχιστο» σημαίνει αυστηρά μικρότερη.
export const marginOf = (price: number, cost: ItemCost): ItemMargin => {
  const amount = roundMoney(price - cost.estimatedCost);
  return {
    amount,
    percent: price === 0 ? 0 : amount / price,
    isBelowMin: price < cost.range.min,
  };
};

// null όταν δεν υπάρχει Κόστος ώρας ή ο θεατής δεν βλέπει ώρες· ποτέ μηδέν που θα έμοιαζε με αληθινό κόστος.
export const costOf = (
  item: CatalogueItem,
  hint: CostHint | null,
): ItemCost | null => {
  if (hint === null || hint.hourCost === null) return null;
  if (item.hoursShoot === null || item.hoursEdit === null) return null;
  const totalHours = item.hoursShoot + item.hoursEdit;
  const hoursCost = roundMoney(totalHours * hint.hourCost);
  const directCost = item.directCost ?? 0;
  const estimatedCost = roundMoney(hoursCost + directCost);
  return {
    totalHours,
    hourCost: hint.hourCost,
    hoursCost,
    directCost,
    estimatedCost,
    range: priceRange(estimatedCost, hint.multipliers),
    hasHours: totalHours > 0,
  };
};

// Το «Ελάχιστο περιθώριο» των Ρυθμίσεων δεν είναι χωριστή ρύθμιση: βγαίνει από τον μικρότερο πολλαπλασιαστή.
export const minimumMargin = (minMultiplier: number): number =>
  minMultiplier <= 1 ? 0 : 1 - 1 / minMultiplier;
