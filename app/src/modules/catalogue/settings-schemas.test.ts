import { describe, expect, it } from "vitest";

import {
  kindFieldsSchema,
  kindRefSchema,
  moveKindSchema,
  saveCostMonthSchema,
  saveMultipliersSchema,
  updateKindSchema,
} from "./settings-schemas";

const ID = "6f1c2f1e-3b0a-4d6e-9d52-0a1b2c3d4e5f";

const validKind = {
  label: "Live",
  labelEn: "Live",
  unit: "μεταδόσεις",
  unitEn: "streams",
  measure: "",
  defaultHours: "",
};

const firstMessage = (result: {
  success: boolean;
  error?: { issues: { message: string }[] };
}) => result.error?.issues[0]?.message;

describe("kindFieldsSchema", () => {
  it("δέχεται είδος που μετράει σε πλήθος", () => {
    const parsed = kindFieldsSchema.parse(validKind);
    expect(parsed).toEqual({
      label: "Live",
      labelEn: "Live",
      unit: "μεταδόσεις",
      unitEn: "streams",
      measure: null,
      defaultHours: null,
    });
  });

  it("κόβει τα κενά γύρω από τα κείμενα", () => {
    const parsed = kindFieldsSchema.parse({ ...validKind, label: "  Live  " });
    expect(parsed.label).toBe("Live");
  });

  it("απαιτεί ετικέτα", () => {
    const result = kindFieldsSchema.safeParse({ ...validKind, label: " " });
    expect(firstMessage(result)).toBe("Γράψε την ετικέτα.");
  });

  it("απαιτεί αγγλική ετικέτα και αγγλική μονάδα", () => {
    const noLabel = kindFieldsSchema.safeParse({ ...validKind, labelEn: "" });
    const noUnit = kindFieldsSchema.safeParse({ ...validKind, unitEn: "" });
    expect(firstMessage(noLabel)).toBe(
      "Γράψε και τα αγγλικά: το είδος φαίνεται στον πελάτη.",
    );
    expect(firstMessage(noUnit)).toBe(
      "Γράψε και τα αγγλικά: το είδος φαίνεται στον πελάτη.",
    );
  });

  it("απαιτεί μονάδα", () => {
    const result = kindFieldsSchema.safeParse({ ...validKind, unit: "" });
    expect(result.success).toBe(false);
  });

  it("δέχεται Τρόπο μέτρησης με προεπιλεγμένη διάρκεια, με κόμμα ή τελεία", () => {
    const comma = kindFieldsSchema.parse({
      ...validKind,
      measure: "per_filming",
      defaultHours: "4,5",
    });
    const dot = kindFieldsSchema.parse({
      ...validKind,
      measure: "per_hour",
      defaultHours: "2.5",
    });
    expect(comma).toMatchObject({ measure: "per_filming", defaultHours: 4.5 });
    expect(dot).toMatchObject({ measure: "per_hour", defaultHours: 2.5 });
  });

  it("δέχεται Τρόπο μέτρησης χωρίς διάρκεια", () => {
    const parsed = kindFieldsSchema.parse({ ...validKind, measure: "per_day" });
    expect(parsed).toMatchObject({ measure: "per_day", defaultHours: null });
  });

  it("η προεπιλεγμένη διάρκεια θέλει Τρόπο μέτρησης", () => {
    const result = kindFieldsSchema.safeParse({
      ...validKind,
      defaultHours: "4",
    });
    expect(firstMessage(result)).toBe(
      "Η προεπιλεγμένη διάρκεια θέλει Τρόπο μέτρησης.",
    );
  });

  it("απορρίπτει διάρκεια εκτός 0,5 έως 24 ή που δεν είναι αριθμός", () => {
    for (const defaultHours of ["0", "0,4", "24,5", "x"]) {
      const result = kindFieldsSchema.safeParse({
        ...validKind,
        measure: "per_hour",
        defaultHours,
      });
      expect(result.success).toBe(false);
    }
  });

  it("δέχεται τα όρια 0,5 και 24", () => {
    for (const defaultHours of ["0,5", "24"]) {
      const result = kindFieldsSchema.safeParse({
        ...validKind,
        measure: "per_hour",
        defaultHours,
      });
      expect(result.success).toBe(true);
    }
  });

  it("απορρίπτει άγνωστο Τρόπο μέτρησης με ελληνικό μήνυμα", () => {
    for (const measure of ["per_week", undefined, 3]) {
      const result = kindFieldsSchema.safeParse({ ...validKind, measure });
      expect(result.success).toBe(false);
      expect(firstMessage(result)).toBe("Διάλεξε Τρόπο μέτρησης.");
    }
  });

  it("η προεπιλεγμένη διάρκεια έχει το πολύ 1 δεκαδικό", () => {
    const result = kindFieldsSchema.safeParse({
      ...validKind,
      measure: "per_hour",
      defaultHours: "2,25",
    });
    expect(firstMessage(result)).toBe(
      "Η προεπιλεγμένη διάρκεια έχει το πολύ 1 δεκαδικό.",
    );
  });

  it("δέχεται προεπιλεγμένη διάρκεια με 1 δεκαδικό ή ακέραιη", () => {
    for (const defaultHours of ["2,5", "4", "0,5"]) {
      const result = kindFieldsSchema.safeParse({
        ...validKind,
        measure: "per_hour",
        defaultHours,
      });
      expect(result.success).toBe(true);
    }
  });
});

describe("updateKindSchema", () => {
  it("θέλει id μαζί με τα πεδία", () => {
    expect(updateKindSchema.safeParse({ ...validKind, id: ID }).success).toBe(
      true,
    );
    expect(
      updateKindSchema.safeParse({ ...validKind, id: "nope" }).success,
    ).toBe(false);
  });
});

describe("kindRefSchema και moveKindSchema", () => {
  it("δέχονται uuid και ξεχωρίζουν κατεύθυνση", () => {
    expect(kindRefSchema.safeParse({ id: ID }).success).toBe(true);
    expect(kindRefSchema.safeParse({ id: "x" }).success).toBe(false);
    expect(moveKindSchema.safeParse({ id: ID, direction: "up" }).success).toBe(
      true,
    );
    expect(
      moveKindSchema.safeParse({ id: ID, direction: "left" }).success,
    ).toBe(false);
  });
});

describe("saveCostMonthSchema", () => {
  const valid = {
    month: "2026-10-01",
    expensesTotal: "8800",
    productiveHours: "220",
  };

  it("δέχεται μήνα, έξοδα και ώρες", () => {
    expect(saveCostMonthSchema.parse(valid)).toEqual({
      month: "2026-10-01",
      expensesTotal: 8800,
      productiveHours: 220,
    });
  });

  it("δέχεται ελληνικό δεκαδικό", () => {
    const parsed = saveCostMonthSchema.parse({
      ...valid,
      expensesTotal: "8800,50",
      productiveHours: "220,5",
    });
    expect(parsed).toMatchObject({
      expensesTotal: 8800.5,
      productiveHours: 220.5,
    });
  });

  it("δέχεται μόνο την πρώτη του μήνα", () => {
    expect(
      saveCostMonthSchema.safeParse({ ...valid, month: "2026-10-15" }).success,
    ).toBe(false);
    expect(saveCostMonthSchema.safeParse({ ...valid, month: "" }).success).toBe(
      false,
    );
  });

  it("απορρίπτει αρνητικά έξοδα, αλλά δέχεται μηδέν", () => {
    expect(
      saveCostMonthSchema.safeParse({ ...valid, expensesTotal: "-1" }).success,
    ).toBe(false);
    expect(
      saveCostMonthSchema.safeParse({ ...valid, expensesTotal: "0" }).success,
    ).toBe(true);
  });

  it("οι παραγωγικές ώρες είναι πάνω από 0 και έως 10.000", () => {
    for (const productiveHours of ["0", "-5", "10001", "abc", ""]) {
      expect(
        saveCostMonthSchema.safeParse({ ...valid, productiveHours }).success,
      ).toBe(false);
    }
    expect(
      saveCostMonthSchema.safeParse({ ...valid, productiveHours: "10000" })
        .success,
    ).toBe(true);
  });

  it("οι παραγωγικές ώρες έχουν το πολύ 1 δεκαδικό", () => {
    const bad = saveCostMonthSchema.safeParse({
      ...valid,
      productiveHours: "220,25",
    });
    expect(firstMessage(bad)).toBe(
      "Οι παραγωγικές ώρες έχουν το πολύ 1 δεκαδικό.",
    );
    expect(
      saveCostMonthSchema.safeParse({ ...valid, productiveHours: "220,5" })
        .success,
    ).toBe(true);
  });

  it("τα έξοδα μήνα έχουν το πολύ 2 δεκαδικά", () => {
    const bad = saveCostMonthSchema.safeParse({
      ...valid,
      expensesTotal: "8800,505",
    });
    expect(firstMessage(bad)).toBe("Το ποσό έχει το πολύ 2 δεκαδικά.");
  });
});

describe("saveMultipliersSchema", () => {
  it("δέχεται σωστή σειρά, και «1,3» γίνεται 1.3", () => {
    expect(
      saveMultipliersSchema.parse({ min: "1,3", target: "1,6", max: "2" }),
    ).toEqual({ min: 1.3, target: 1.6, max: 2 });
  });

  it("δέχεται ίσες τιμές και ελάχιστη ακριβώς 1", () => {
    expect(
      saveMultipliersSchema.safeParse({ min: "1", target: "1", max: "1" })
        .success,
    ).toBe(true);
  });

  it("απορρίπτει στόχο κάτω από την ελάχιστη", () => {
    const result = saveMultipliersSchema.safeParse({
      min: "1,5",
      target: "1,2",
      max: "2",
    });
    expect(firstMessage(result)).toBe(
      "Οι πολλαπλασιαστές ξεκινούν από 1 και ανεβαίνουν: ελάχιστη, στόχος, μέγιστη.",
    );
  });

  it("απορρίπτει ελάχιστη κάτω από 1 και μέγιστη πάνω από 20", () => {
    expect(
      saveMultipliersSchema.safeParse({ min: "0,9", target: "1,5", max: "2" })
        .success,
    ).toBe(false);
    expect(
      saveMultipliersSchema.safeParse({ min: "1,3", target: "1,6", max: "21" })
        .success,
    ).toBe(false);
  });

  it("απορρίπτει μηδέν, αρνητικό και ό,τι δεν είναι αριθμός", () => {
    for (const min of ["0", "-1", "x", ""]) {
      expect(
        saveMultipliersSchema.safeParse({ min, target: "1,6", max: "2" })
          .success,
      ).toBe(false);
    }
  });
});
