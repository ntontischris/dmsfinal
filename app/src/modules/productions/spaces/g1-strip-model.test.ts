import { describe, expect, it } from "vitest";

import type { ProductionCard } from "../types";
import { NO_SIGNALS, type G1Signals } from "./g1-rows";
import { productionsStripOf } from "./g1-strip-model";

const cardOf = (id: string): ProductionCard => ({
  id,
  title: `Παραγωγή ${id}`,
  client: null,
  period: null,
  owner: null,
  state: "open",
  isInternal: false,
});

const signalsOf = (over: Partial<G1Signals>): G1Signals => ({
  ...NO_SIGNALS,
  ...over,
});

describe("τα τρία χοντρά της καρτέλας Παραγωγές", () => {
  it("μετρά ώρες, υπέρβαση και έλεγχο, με σύνδεσμο στο σωστό σημείο", () => {
    const strip = productionsStripOf({
      cards: [cardOf("a"), cardOf("b"), cardOf("c")],
      signals: signalsOf({
        needsHours: new Set(["a", "b"]),
        overrun: new Set(["c"]),
        inReview: new Map([
          ["a", 2],
          ["c", 1],
        ]),
      }),
      canSeeCost: true,
      canReview: true,
    });
    expect(strip.map(({ label, value, href }) => [label, value, href])).toEqual(
      [
        ["Θέλουν ώρες", "2", "/app/productions?view=hours"],
        ["Υπέρβαση κόστους", "1", "/app/productions/costs"],
        ["Προς έλεγχο", "3", "/app/deliverables?view=review"],
      ],
    );
    expect(strip.every((stat) => stat.tone === "attention")).toBe(true);
  });

  it("μετρά μόνο τις Παραγωγές που βλέπει η σελίδα (π.χ. με φίλτρο Πελάτη)", () => {
    const [hours] = productionsStripOf({
      cards: [cardOf("a")],
      signals: signalsOf({ needsHours: new Set(["a", "zzz"]) }),
      canSeeCost: true,
      canReview: false,
    });
    expect(hours.value).toBe("1");
  });

  it("χωρίς δικαίωμα κόστους ή ελέγχου οι κάρτες τους δεν μπαίνουν· στο 0 είναι ήσυχες", () => {
    const strip = productionsStripOf({
      cards: [],
      signals: NO_SIGNALS,
      canSeeCost: false,
      canReview: true,
    });
    expect(strip).toEqual([
      expect.objectContaining({
        label: "Προς έλεγχο",
        value: "0",
        tone: undefined,
      }),
    ]);
  });
});
