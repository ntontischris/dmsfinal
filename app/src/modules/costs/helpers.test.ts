import { describe, expect, it } from "vitest";

import {
  decimalText,
  formatHours,
  formatPercent,
  marginOf,
  signalLabels,
} from "./helpers";
import type { CostRow } from "./types";

const row = (changes: Partial<{ price: number | null; cost: number }> = {}): CostRow => ({
  productionId: "6f1c2f1e-3b0a-4d6e-9d52-0a1b2c3d4e5f",
  title: "Showreel",
  client: "Acme",
  state: "delivered",
  estimate: { shootHours: 6, editHours: 14, directCost: 0, price: changes.price === undefined ? 1000 : changes.price, cost: 200 },
  actual: {
    shootHours: 8, shootConfirmed: true, editHours: 14, editConfirmed: true,
    directCost: 0, cost: changes.cost ?? 220, suggestedShootHours: 8,
  },
  hourCost: 10,
  hoursComplete: true,
  signals: { lowMargin: false, overrun: false },
});

describe("περιθώριο", () => {
  it("είναι τιμή μείον πραγματικό κόστος, με ποσοστό επί της τιμής", () => {
    expect(marginOf(row())).toEqual({ amount: 780, percent: 0.78 });
  });

  it("είναι null για Εσωτερική Παραγωγή, ώστε να μη φαίνεται ως κέρδος μηδέν", () => {
    expect(marginOf(row({ price: null }))).toBeNull();
  });

  it("μένει σωστό όταν η τιμή είναι μηδέν", () => {
    expect(marginOf(row({ price: 0 }))).toEqual({ amount: -220, percent: 0 });
  });
});

describe("σήματα", () => {
  it("δείχνει μόνο τα ενεργά, με τη σειρά Χαμηλό περιθώριο και μετά Υπέρβαση", () => {
    expect(signalLabels({ lowMargin: true, overrun: true })).toEqual([
      "Χαμηλό περιθώριο",
      "Υπέρβαση",
    ]);
    expect(signalLabels({ lowMargin: false, overrun: true })).toEqual(["Υπέρβαση"]);
  });

  it("είναι κενό όταν δεν υπάρχει σήμα", () => {
    expect(signalLabels({ lowMargin: false, overrun: false })).toEqual([]);
  });
});

describe("μορφοποίηση", () => {
  it("γράφει ώρα στον ενικό και ώρες στον πληθυντικό", () => {
    expect(formatHours(1)).toBe("1 ώρα");
    expect(formatHours(14)).toBe("14 ώρες");
  });

  it("γράφει ποσοστό με ένα δεκαδικό και δεκαδικό με κόμμα στα πεδία", () => {
    expect(formatPercent(0.78)).toBe("78%");
    expect(decimalText(6.5)).toBe("6,5");
  });
});
