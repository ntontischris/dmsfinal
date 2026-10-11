import { describe, expect, it } from "vitest";

import { estimateFormSchema, hoursFormSchema, parseCostGroup, parseAmount } from "./schemas";

const PRODUCTION = "6f1c2f1e-3b0a-4d6e-9d52-0a1b2c3d4e5f";

const messageOf = (result: { success: boolean; error?: { issues: { message: string }[] } }) =>
  result.success ? null : result.error?.issues[0]?.message;

describe("parseAmount", () => {
  it("δέχεται κόμμα ή τελεία και κενό = null", () => {
    expect(parseAmount("6,5", 1)).toBe(6.5);
    expect(parseAmount("6.5", 1)).toBe(6.5);
    expect(parseAmount("   ", 1)).toBeNull();
  });

  it("απορρίπτει περισσότερα δεκαδικά από όσα χωράει η στήλη", () => {
    expect(parseAmount("6,25", 1)).toBeUndefined();
    expect(parseAmount("150,50", 2)).toBe(150.5);
  });
});

describe("hoursFormSchema", () => {
  const base = { productionId: PRODUCTION, shootHours: "8", editHours: "14", directCost: "", confirmShoot: "on", confirmEdit: "" };

  it("μετατρέπει τα πεδία και τα τσεκαρισμένα κουτιά", () => {
    expect(hoursFormSchema.parse({ ...base, editHours: "14,5" })).toEqual({
      productionId: PRODUCTION,
      shootHours: 8,
      editHours: 14.5,
      directCost: null,
      confirmShoot: true,
      confirmEdit: false,
    });
  });

  it("δεν δέχεται επιβεβαίωση χωρίς ώρες", () => {
    expect(messageOf(hoursFormSchema.safeParse({ ...base, editHours: "", confirmEdit: "on" }))).toBe(
      "Γράψε τις ώρες μοντάζ πριν την επιβεβαίωση.",
    );
  });

  it("δεν δέχεται ώρες πάνω από 999", () => {
    expect(messageOf(hoursFormSchema.safeParse({ ...base, shootHours: "1000" }))).toBe(
      "Γράψε ώρες από 0 έως 999, με το πολύ 1 δεκαδικό (π.χ. 6,5).",
    );
  });
});

describe("estimateFormSchema", () => {
  it("θέλει και τα τρία πεδία", () => {
    expect(
      messageOf(estimateFormSchema.safeParse({ productionId: PRODUCTION, shootHours: "6", editHours: "", directCost: "0" })),
    ).toBe("Γράψε τις ώρες της εκτίμησης (π.χ. 6 ή 6,5).");
  });
});

describe("parseCostGroup", () => {
  it("δέχεται τις τρεις ομάδες και πέφτει στα «Θέλουν ώρες» για ό,τι άλλο", () => {
    expect(parseCostGroup("overrun")).toBe("overrun");
    expect(parseCostGroup("rest")).toBe("rest");
    expect(parseCostGroup("άγνωστο")).toBe("needs_hours");
    expect(parseCostGroup(undefined)).toBe("needs_hours");
  });
});
