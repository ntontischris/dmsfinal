import { describe, expect, it } from "vitest";

import {
  revisionLimitsInputSchema,
  savePolicySchema,
  savePricingSchema,
  saveTermsSchema,
} from "./settings-schemas";

const KIND = "6f1c2f1e-3b0a-4d6e-9d52-0a1b2c3d4e5f";
const OTHER_KIND = "7a2d3a2f-4c1b-4e7f-8e63-1b2c3d4e5f60";

const monthly = {
  set: "monthly",
  paymentDays: "15",
  unusedProvisions: "next_period",
  graceDays: "10",
  durationMonths: "6",
  renewal: "new_opportunity",
  dissolutionNoticeDays: "30",
  dissolutionFee: "",
};

const firstMessage = (result: {
  success: boolean;
  error?: { issues: { message: string }[] };
}) => result.error?.issues[0]?.message;

describe("saveTermsSchema", () => {
  it("δέχεται τους Όρους των μηνιαίων", () => {
    expect(saveTermsSchema.parse(monthly)).toEqual({
      set: "monthly",
      paymentDays: 15,
      unusedProvisions: "next_period",
      graceDays: 10,
      durationMonths: 6,
      renewal: "new_opportunity",
      dissolutionNoticeDays: 30,
      dissolutionFee: null,
    });
  });

  it("η εφάπαξ στέλνει μόνο Μέρες πληρωμής και τα υπόλοιπα γίνονται null", () => {
    const parsed = saveTermsSchema.parse({
      set: "one_off",
      paymentDays: "30",
      unusedProvisions: "",
      graceDays: "",
      durationMonths: "",
      renewal: "",
      dissolutionNoticeDays: "",
      dissolutionFee: "",
    });
    expect(parsed).toEqual({
      set: "one_off",
      paymentDays: 30,
      unusedProvisions: null,
      graceDays: null,
      durationMonths: null,
      renewal: null,
      dissolutionNoticeDays: null,
      dissolutionFee: null,
    });
  });

  it("η ρήτρα λύσης δέχεται κόμμα και κενό σημαίνει «δεν αλλάζει»", () => {
    expect(
      saveTermsSchema.parse({ ...monthly, dissolutionFee: "250,50" })
        .dissolutionFee,
    ).toBe(250.5);
    const withoutFee = Object.fromEntries(
      Object.entries(monthly).filter(([key]) => key !== "dissolutionFee"),
    );
    expect(saveTermsSchema.parse(withoutFee).dissolutionFee).toBeNull();
  });

  it("απορρίπτει άγνωστο σετ, Διάρκεια εκτός ορίων και Μέρες πληρωμής εκτός ορίων", () => {
    expect(
      saveTermsSchema.safeParse({ ...monthly, set: "weekly" }).success,
    ).toBe(false);
    expect(
      firstMessage(
        saveTermsSchema.safeParse({ ...monthly, durationMonths: "61" }),
      ),
    ).toBe("Η Διάρκεια είναι από 1 έως 60 μήνες.");
    expect(
      saveTermsSchema.safeParse({ ...monthly, paymentDays: "366" }).success,
    ).toBe(false);
  });

  it("απορρίπτει άγνωστη επιλογή αχρησιμοποίητων Παροχών και ανανέωσης", () => {
    expect(
      saveTermsSchema.safeParse({ ...monthly, unusedProvisions: "x" }).success,
    ).toBe(false);
    expect(
      saveTermsSchema.safeParse({ ...monthly, renewal: "later" }).success,
    ).toBe(false);
  });

  it("απορρίπτει αρνητική ρήτρα λύσης", () => {
    expect(
      saveTermsSchema.safeParse({ ...monthly, dissolutionFee: "-5" }).success,
    ).toBe(false);
  });
});

describe("savePolicySchema", () => {
  const policy = {
    filmingNoticeHours: "48",
    filmingCancelHours: "24",
    lateCancelBurns: "yes",
    noShowBurns: "no",
  };

  it("δέχεται ώρες και ναι/όχι ως boolean", () => {
    expect(savePolicySchema.parse(policy)).toEqual({
      filmingNoticeHours: 48,
      filmingCancelHours: 24,
      lateCancelBurns: true,
      noShowBurns: false,
    });
  });

  it("απορρίπτει ώρες πάνω από 720 και άγνωστη επιλογή", () => {
    expect(
      savePolicySchema.safeParse({ ...policy, filmingNoticeHours: "721" })
        .success,
    ).toBe(false);
    expect(
      savePolicySchema.safeParse({ ...policy, noShowBurns: "maybe" }).success,
    ).toBe(false);
  });
});

describe("savePricingSchema", () => {
  const pricing = {
    proposalValidityDays: "21",
    advancePercent: "50",
    standardDiscountPercent: "10",
    standardDiscountMonths: "2",
  };

  it("δέχεται ισχύ, προκαταβολή και τυπική έκπτωση", () => {
    expect(savePricingSchema.parse(pricing)).toEqual({
      proposalValidityDays: 21,
      advancePercent: 50,
      standardDiscountPercent: 10,
      standardDiscountMonths: 2,
    });
  });

  it("δέχεται δεκαδικό με κόμμα στα ποσοστά", () => {
    expect(
      savePricingSchema.parse({ ...pricing, advancePercent: "33,5" })
        .advancePercent,
    ).toBe(33.5);
  });

  it("η έκπτωση θέλει και ποσοστό και μήνες", () => {
    const result = savePricingSchema.safeParse({
      ...pricing,
      standardDiscountMonths: "0",
    });
    expect(firstMessage(result)).toBe("Η έκπτωση θέλει και ποσοστό και μήνες.");
    expect(
      savePricingSchema.safeParse({
        ...pricing,
        standardDiscountPercent: "0",
        standardDiscountMonths: "0",
      }).success,
    ).toBe(true);
  });

  it("απορρίπτει ισχύ 0 και ποσοστό πάνω από 100", () => {
    expect(
      savePricingSchema.safeParse({ ...pricing, proposalValidityDays: "0" })
        .success,
    ).toBe(false);
    expect(
      savePricingSchema.safeParse({ ...pricing, advancePercent: "101" })
        .success,
    ).toBe(false);
  });
});

describe("revisionLimitsInputSchema", () => {
  it("δέχεται γύρους και null για «χωρίς γύρους»", () => {
    const text = JSON.stringify([
      { kindId: KIND, rounds: 3 },
      { kindId: OTHER_KIND, rounds: null },
    ]);
    expect(revisionLimitsInputSchema.parse(text)).toEqual([
      { kindId: KIND, rounds: 3 },
      { kindId: OTHER_KIND, rounds: null },
    ]);
  });

  it("απορρίπτει γύρους εκτός 1–20, κείμενο ή δεκαδικό", () => {
    for (const rounds of [0, 21, "abc", 2.5]) {
      const text = JSON.stringify([{ kindId: KIND, rounds }]);
      expect(revisionLimitsInputSchema.safeParse(text).success).toBe(false);
    }
  });

  it("απορρίπτει διπλό είδος και JSON που δεν διαβάζεται", () => {
    const duplicate = JSON.stringify([
      { kindId: KIND, rounds: 1 },
      { kindId: KIND, rounds: 2 },
    ]);
    expect(revisionLimitsInputSchema.safeParse(duplicate).success).toBe(false);
    expect(revisionLimitsInputSchema.safeParse("{oops").success).toBe(false);
    expect(revisionLimitsInputSchema.safeParse("").success).toBe(false);
  });
});
