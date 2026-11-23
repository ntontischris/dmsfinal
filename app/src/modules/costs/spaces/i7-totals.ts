// I7 (εμφάνιση «Χρημάτων»): τα σύνολα της κεφαλίδας. Μετρούν μόνο οι Παραγωγές Πελατών με τιμή και πραγματικές ώρες,
// όπως στις ομαδοποιήσεις· η εσωτερική δουλειά μετρά χωριστά ως κόστος. Καθαρές συναρτήσεις.

import type { ProductionRow } from "./i7-model";

export interface ProfitTotals {
  price: number;
  cost: number;
  profit: number;
  counted: number;
  missing: number;
  internalCost: number;
}

const sum = (values: readonly number[]): number =>
  values.reduce((s, v) => s + v, 0);

export const totalsOf = (rows: readonly ProductionRow[]): ProfitTotals => {
  const counted = rows.filter(
    (r) =>
      !r.internal && !r.missingHours && r.price !== null && r.actualCost !== null,
  );
  const price = sum(counted.map((r) => r.price ?? 0));
  const cost = sum(counted.map((r) => r.actualCost ?? 0));
  const internal = rows.filter((r) => r.internal && !r.missingHours);
  return {
    price,
    cost,
    profit: price - cost,
    counted: counted.length,
    missing: rows.filter((r) => r.missingHours).length,
    internalCost: sum(internal.map((r) => r.actualCost ?? 0)),
  };
};

// Το πρόσημο ενός κέρδους για το χρώμα: κέρδος, ζημιά ή τίποτα ακόμα.
export type ProfitSign = "gain" | "loss" | "none";

export const signOf = (value: number | null): ProfitSign =>
  value === null || value === 0 ? "none" : value > 0 ? "gain" : "loss";
