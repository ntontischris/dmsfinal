// Η αριθμητική κόστους και περιθωρίου της D2. Δικό μας αντίγραφο: το module δεν εισάγει τον Κατάλογο.
// Η βάση δίνει το κόστος και τους πολλαπλασιαστές· εδώ γίνονται μόνο το Εύρος τιμής και το περιθώριο.

export interface Multipliers {
  min: number;
  target: number;
  max: number;
}

export interface Margin {
  amount: number;
  percent: number;
  isBelowMin: boolean;
}

export const roundMoney = (value: number): number =>
  Math.round((value + Number.EPSILON) * 100) / 100;

export const priceRange = (
  estimatedCost: number,
  multipliers: Multipliers,
): Multipliers => ({
  min: roundMoney(estimatedCost * multipliers.min),
  target: roundMoney(estimatedCost * multipliers.target),
  max: roundMoney(estimatedCost * multipliers.max),
});

// Η ελάχιστη τιμή επιτρέπεται: «κάτω από το ελάχιστο» σημαίνει αυστηρά μικρότερη από κόστος × ελάχιστος πολλαπλασιαστής.
// Χωρίς κόστος (0) δεν υπάρχει τι να συγκριθεί, άρα ποτέ «κάτω από το ελάχιστο».
export const marginOf = (
  price: number,
  estimatedCost: number,
  minMultiplier: number,
): Margin => {
  const amount = roundMoney(price - estimatedCost);
  return {
    amount,
    percent: price === 0 ? 0 : amount / price,
    isBelowMin: estimatedCost > 0 && price < roundMoney(estimatedCost * minMultiplier),
  };
};
