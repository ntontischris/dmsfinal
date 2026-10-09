import { describe, expect, it } from "vitest";

import {
  milestonesFieldSchema,
  moneySchema,
  provisionsFieldSchema,
  recipientsFieldSchema,
  revisionLimitsFieldSchema,
} from "./schemas";

// Τα κρυφά πεδία JSON και τα ποσά των φορμών (συνέχεια του schemas.test.ts).

const KIND_A = "11111111-1111-4111-8111-111111111111";
const KIND_B = "22222222-2222-4222-8222-222222222222";
const GREEK = /[Ͱ-Ͽ]/;

const json = (value: unknown): string => JSON.stringify(value);

const messagesOf = (result: {
  success: boolean;
  error?: { issues: { message: string }[] };
}): string[] => result.error?.issues.map((issue) => issue.message) ?? [];

describe("milestonesFieldSchema", () => {
  const signature = { trigger: "signature", percent: 50 };
  it("δέχεται δόσεις και καθαρίζει την ημερομηνία όπου δεν χρειάζεται", () => {
    const parsed = milestonesFieldSchema.parse(
      json([
        { ...signature, dueOn: "2026-11-01" },
        { trigger: "date", percent: 50, dueOn: "2026-12-01" },
      ]),
    );
    expect(parsed).toEqual([
      { trigger: "signature", percent: 50, dueOn: null },
      { trigger: "date", percent: 50, dueOn: "2026-12-01" },
    ]);
  });
  it("απορρίπτει 7 δόσεις και καμία δόση", () => {
    const seven = Array.from({ length: 7 }, () => signature);
    expect(milestonesFieldSchema.safeParse(json(seven)).success).toBe(false);
    expect(milestonesFieldSchema.safeParse("").success).toBe(false);
  });
  it("η δόση «Ημερομηνία» θέλει ημερομηνία", () => {
    const result = milestonesFieldSchema.safeParse(
      json([{ trigger: "date", percent: 100 }]),
    );
    expect(messagesOf(result)).toContain(
      "Η δόση «Ημερομηνία» θέλει ημερομηνία.",
    );
  });
  it("απορρίπτει ποσοστό 0, πάνω από 100 και τρία δεκαδικά", () => {
    for (const percent of [0, 101, 33.333])
      expect(
        milestonesFieldSchema.safeParse(json([{ trigger: "signature", percent }]))
          .success,
      ).toBe(false);
  });
  it("δεν διαβάζεται: ελληνικό μήνυμα", () => {
    for (const raw of ["{", "{}", "5", "null"])
      expect(
        messagesOf(milestonesFieldSchema.safeParse(raw)).every((m) => GREEK.test(m)),
      ).toBe(true);
  });
});

describe("recipientsFieldSchema", () => {
  const anna = { name: "Άννα", email: "anna@example.gr", isSignatory: true };
  const nikos = { name: "Νίκος", email: "nikos@example.gr", isSignatory: false };
  it("δέχεται παραλήπτες με έναν Υπογράφοντα και τους καθαρίζει", () => {
    const parsed = recipientsFieldSchema.parse(
      json([{ ...anna, name: " Άννα " }, nikos]),
    );
    expect(parsed.map((r) => r.name)).toEqual(["Άννα", "Νίκος"]);
  });
  it("απορρίπτει δύο Υπογράφοντες και κανέναν", () => {
    const two = [anna, { ...nikos, isSignatory: true }];
    const none = [{ ...anna, isSignatory: false }, nikos];
    expect(messagesOf(recipientsFieldSchema.safeParse(json(two)))).toContain(
      "Χρειάζεται ακριβώς ένας Υπογράφων.",
    );
    expect(messagesOf(recipientsFieldSchema.safeParse(json(none)))).toContain(
      "Χρειάζεται ακριβώς ένας Υπογράφων.",
    );
  });
  it("απορρίπτει διπλό email χωρίς διάκριση πεζών-κεφαλαίων", () => {
    const result = recipientsFieldSchema.safeParse(
      json([anna, { ...nikos, email: "ANNA@example.gr" }]),
    );
    expect(messagesOf(result)).toContain("Ο ίδιος παραλήπτης μπαίνει μία φορά.");
  });
  it("απορρίπτει άκυρο email, κενό όνομα, κενή λίστα και 11 παραλήπτες", () => {
    expect(
      recipientsFieldSchema.safeParse(json([{ ...anna, email: "anna" }])).success,
    ).toBe(false);
    expect(
      recipientsFieldSchema.safeParse(json([{ ...anna, name: " " }])).success,
    ).toBe(false);
    expect(recipientsFieldSchema.safeParse("").success).toBe(false);
    const eleven = Array.from({ length: 11 }, (_, index) => ({
      name: `Π${index}`,
      email: `p${index}@example.gr`,
      isSignatory: index === 0,
    }));
    expect(recipientsFieldSchema.safeParse(json(eleven)).success).toBe(false);
  });
});

describe("revisionLimitsFieldSchema", () => {
  it("δέχεται γύρους 1–20, κενό = καμία", () => {
    expect(
      revisionLimitsFieldSchema.parse(json([{ kindId: KIND_A, rounds: 2 }])),
    ).toEqual([{ kindId: KIND_A, rounds: 2 }]);
    expect(revisionLimitsFieldSchema.parse("")).toEqual([]);
  });
  it("απορρίπτει 0, 21, δεκαδικά και διπλό είδος", () => {
    for (const rounds of [0, 21, 1.5])
      expect(
        revisionLimitsFieldSchema.safeParse(json([{ kindId: KIND_A, rounds }]))
          .success,
      ).toBe(false);
    expect(
      revisionLimitsFieldSchema.safeParse(
        json([
          { kindId: KIND_A, rounds: 2 },
          { kindId: KIND_A, rounds: 3 },
        ]),
      ).success,
    ).toBe(false);
  });
});

describe("provisionsFieldSchema", () => {
  it("δέχεται Παροχές και κενό = καμία", () => {
    expect(
      provisionsFieldSchema.parse(
        json([
          { kindId: KIND_A, quantity: 2 },
          { kindId: KIND_B, quantity: 8 },
        ]),
      ),
    ).toHaveLength(2);
    expect(provisionsFieldSchema.parse("")).toEqual([]);
  });
  it("απορρίπτει ποσότητα 0, 1000 και διπλό είδος", () => {
    for (const quantity of [0, 1000])
      expect(
        provisionsFieldSchema.safeParse(json([{ kindId: KIND_A, quantity }])).success,
      ).toBe(false);
    expect(
      messagesOf(
        provisionsFieldSchema.safeParse(
          json([
            { kindId: KIND_A, quantity: 1 },
            { kindId: KIND_A, quantity: 2 },
          ]),
        ),
      ),
    ).toContain("Κάθε είδος Παροχής μπαίνει μία φορά.");
  });
  it("ό,τι δεν είναι λίστα δίνει ελληνικό μήνυμα, ποτέ αγγλικό", () => {
    for (const raw of ["{}", "5", "null", "[1]", "[{}]"])
      expect(
        messagesOf(provisionsFieldSchema.safeParse(raw)).every((m) => GREEK.test(m)),
      ).toBe(true);
  });
});

describe("moneySchema", () => {
  it("δέχεται κόμμα ή τελεία και μέχρι 2 δεκαδικά", () => {
    expect(moneySchema.parse("1300,50")).toBe(1300.5);
    expect(moneySchema.parse("300")).toBe(300);
  });
  it("απορρίπτει αμφίσημο, αρνητικό, 3 δεκαδικά και ό,τι δεν είναι αριθμός", () => {
    for (const raw of ["1.300", "-1", "1,005", "abc", "", "10000000"])
      expect(moneySchema.safeParse(raw).success).toBe(false);
  });
});
