import { describe, expect, it } from "vitest";

import {
  moneySchema,
  provisionsFieldSchema,
  setCostSchema,
  updateItemSchema,
} from "./schemas";

// Ποσά, ώρες και Παροχές: τα όρια της βάσης και τα ελληνικά μηνύματα (συνέχεια του schemas.test.ts).

const ITEM = "11111111-1111-4111-8111-111111111111";
const SHOOT = "22222222-2222-4222-8222-222222222222";
const UNREADABLE = "Οι Παροχές δεν διαβάστηκαν· δοκίμασε ξανά.";
const GREEK = /[Ͱ-Ͽ]/;
const AMBIGUOUS = "Γράψε το ποσό χωρίς τελεία χιλιάδων, π.χ. 1300 ή 1300,50.";

const firstMessage = (result: {
  success: boolean;
  error?: { issues: { message: string }[] };
}): string | undefined => result.error?.issues[0]?.message;

describe("provisionsFieldSchema (λάθος σχήμα)", () => {
  it("ό,τι δεν είναι λίστα δίνει το ελληνικό μήνυμα, ποτέ αγγλικό", () => {
    for (const raw of ["{}", "5", "null", '"x"', "true", '{"kindId":"x"}']) {
      const result = provisionsFieldSchema.safeParse(raw);
      expect(result.success).toBe(false);
      expect(
        !result.success && result.error.issues.map((i) => i.message),
      ).toEqual([UNREADABLE]);
    }
  });
  it("στοιχείο λάθος σχήματος δίνει μόνο ελληνικά μηνύματα", () => {
    for (const raw of [
      "[1]",
      "[null]",
      "[{}]",
      `[{"kindId":"${SHOOT}"}]`,
      `[{"kindId":5,"quantity":1}]`,
      `[{"kindId":"${SHOOT}","quantity":"2"}]`,
      `[{"kindId":"${SHOOT}","quantity":1.5}]`,
    ]) {
      const result = provisionsFieldSchema.safeParse(raw);
      expect(result.success).toBe(false);
      const messages = !result.success
        ? result.error.issues.map((i) => i.message)
        : [];
      expect(messages.length).toBeGreaterThan(0);
      expect(messages.every((m) => GREEK.test(m))).toBe(true);
    }
  });
});

describe("moneySchema (όρια)", () => {
  it("απορρίπτει το αμφίσημο «1.300» με ελληνικό μήνυμα", () => {
    for (const raw of ["1.300", "1,300", "12.500"]) {
      expect(firstMessage(moneySchema.safeParse(raw))).toBe(AMBIGUOUS);
    }
  });
  it("δέχεται το πολύ 2 δεκαδικά", () => {
    expect(moneySchema.safeParse("1300,5").success).toBe(true);
    expect(moneySchema.safeParse("1300.55").success).toBe(true);
    expect(moneySchema.safeParse("1300,5555").success).toBe(false);
    expect(firstMessage(moneySchema.safeParse("1300,5555"))).toBe(
      "Το ποσό έχει το πολύ 2 δεκαδικά.",
    );
  });
  it("το όριο είναι κάτω από 10.000.000 όπως στη βάση", () => {
    expect(moneySchema.safeParse("9999999,99").success).toBe(true);
    expect(moneySchema.safeParse("10000000").success).toBe(false);
    expect(firstMessage(moneySchema.safeParse("10000000"))).toBe(
      "Το ποσό πρέπει να είναι μικρότερο από 10.000.000 €.",
    );
  });
});

describe("updateItemSchema (τιμή)", () => {
  const base = { itemId: ITEM, name: "Social A", description: "", unit: "" };
  it("η τιμή έχει το πολύ 2 δεκαδικά, όριο και δεν δέχεται «1.300»", () => {
    expect(
      updateItemSchema.safeParse({ ...base, price: "12,3456" }).success,
    ).toBe(false);
    expect(
      updateItemSchema.safeParse({ ...base, price: "10000000" }).success,
    ).toBe(false);
    expect(
      firstMessage(updateItemSchema.safeParse({ ...base, price: "1.300" })),
    ).toBe(AMBIGUOUS);
  });
});

describe("setCostSchema (όρια)", () => {
  it("οι ώρες έχουν όριο 999 και ένα δεκαδικό, με ελληνικά μηνύματα", () => {
    const hours = "Οι ώρες είναι από 0 έως 999, με ένα δεκαδικό το πολύ.";
    expect(
      setCostSchema.safeParse({ itemId: ITEM, hoursShoot: "999" }).success,
    ).toBe(true);
    expect(
      firstMessage(
        setCostSchema.safeParse({ itemId: ITEM, hoursShoot: "999,5" }),
      ),
    ).toBe(hours);
    expect(
      firstMessage(
        setCostSchema.safeParse({ itemId: ITEM, hoursEdit: "6,55" }),
      ),
    ).toBe(hours);
    expect(
      firstMessage(
        setCostSchema.safeParse({ itemId: ITEM, hoursEdit: "1.500" }),
      ),
    ).toBe("Γράψε τις ώρες χωρίς τελεία χιλιάδων, π.χ. 1500 ή 6,5.");
  });
  it("το Άμεσο κόστος έχει το πολύ 2 δεκαδικά και όριο", () => {
    expect(
      setCostSchema.safeParse({ itemId: ITEM, directCost: "25,5555" }).success,
    ).toBe(false);
    expect(
      setCostSchema.safeParse({ itemId: ITEM, directCost: "10000000" }).success,
    ).toBe(false);
  });
});
