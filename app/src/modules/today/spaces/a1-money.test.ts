import { describe, expect, it } from "vitest";

import type { TodayMoney } from "../view-schema";
import { barsOf, overdueLeadOf, overdueTotalOf, paceOf } from "./a1-money";

const moneyOf = (overrides: Partial<TodayMoney> = {}): TodayMoney => ({
  overdueCents: 394_000,
  overdueCount: 6,
  clientCount: 3,
  debtors: [],
  month: {
    month: 11,
    day: 5,
    days: 30,
    collectedCents: 120_000,
    expectedCents: 480_000,
  },
  ...overrides,
});

describe("overdueLeadOf", () => {
  it("το ποσό και από πόσους πελάτες", () => {
    expect(overdueLeadOf(moneyOf())).toBe(
      "Ληξιπρόθεσμα 3.940 € από 3 πελάτες.",
    );
    expect(overdueLeadOf(moneyOf({ clientCount: 1, overdueCount: 2 }))).toBe(
      "Ληξιπρόθεσμα 3.940 € από 1 πελάτη.",
    );
  });

  it("το μηδέν λέγεται με λέξεις", () => {
    expect(
      overdueLeadOf(
        moneyOf({ overdueCents: 0, overdueCount: 0, clientCount: 0 }),
      ),
    ).toBe("Κανένα ληξιπρόθεσμο Τιμολόγιο.");
  });
});

describe("overdueTotalOf", () => {
  it("μεγάλο ποσό σε ακέραια ευρώ και πόσα τιμολόγια", () => {
    expect(overdueTotalOf(moneyOf())).toEqual({
      amount: "3.940 €",
      detail: "ληξιπρόθεσμα · 6 τιμολόγια",
    });
    expect(overdueTotalOf(moneyOf({ overdueCount: 1 })).detail).toBe(
      "ληξιπρόθεσμα · 1 τιμολόγιο",
    );
  });
});

describe("paceOf", () => {
  it("η φράση του μήνα και πού θα έπρεπε να είμαστε", () => {
    const pace = paceOf(moneyOf());
    expect(pace.sentence).toBe(
      "Νοέμβριος: μπήκαν 1.200 € από 4.800 € που λήγουν αυτόν τον μήνα.",
    );
    expect(pace.share).toBe(0.25);
    expect(pace.shouldBe).toBeCloseTo(5 / 30);
    expect(pace.verdict).toBe("Μπροστά από τον ρυθμό του μήνα.");
  });

  it("πίσω από τον ρυθμό όταν μπήκε λιγότερο από το μερίδιο των ημερών", () => {
    const pace = paceOf(
      moneyOf({
        month: {
          month: 3,
          day: 20,
          days: 31,
          collectedCents: 100_000,
          expectedCents: 400_000,
        },
      }),
    );
    expect(pace.sentence.startsWith("Μάρτιος:")).toBe(true);
    expect(pace.verdict).toBe("Πίσω από τον ρυθμό του μήνα.");
  });

  it("χωρίς αναμενόμενα: καμία κρίση για τον ρυθμό", () => {
    const pace = paceOf(
      moneyOf({
        month: {
          month: 2,
          day: 3,
          days: 28,
          collectedCents: 0,
          expectedCents: 0,
        },
      }),
    );
    expect(pace.verdict).toBeNull();
    expect(pace.share).toBe(0);
    expect(pace.sentence).toBe(
      "Φεβρουάριος: δεν λήγει κανένα Τιμολόγιο αυτόν τον μήνα.",
    );
  });

  it("εισπράχθηκαν = εξοφλημένο μέρος των ίδιων Τιμολογίων, ποτέ πάνω από τα αναμενόμενα", () => {
    const pace = paceOf(
      moneyOf({
        month: {
          month: 11,
          day: 30,
          days: 30,
          collectedCents: 480_000,
          expectedCents: 480_000,
        },
      }),
    );
    expect(pace.share).toBe(1);
    expect(pace.verdict).toBe("Μπροστά από τον ρυθμό του μήνα.");
  });
});

describe("barsOf", () => {
  it("ανάλογες με τον μεγαλύτερο", () => {
    expect(barsOf([148_800, 74_400, 40_300])).toEqual([100, 50, 27]);
    expect(barsOf([])).toEqual([]);
  });
});
