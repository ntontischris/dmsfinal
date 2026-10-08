import { describe, expect, it } from "vitest";

import {
  addCatalogueLineSchema,
  addFreeLineSchema,
  basicsSchema,
  createAgreementSchema,
  moneyTermsSchema,
  termsSchema,
  updateLineSchema,
} from "./schemas";

const ID = "11111111-1111-4111-8111-111111111111";
const OTHER = "22222222-2222-4222-8222-222222222222";

const messageOf = (result: {
  success: boolean;
  error?: { issues: { message: string }[] };
}): string | undefined => result.error?.issues[0]?.message;

describe("createAgreementSchema", () => {
  it("δέχεται και τα δύο είδη", () => {
    for (const kind of ["monthly", "one_off"])
      expect(
        createAgreementSchema.safeParse({ opportunityId: ID, kind, title: "" })
          .success,
      ).toBe(true);
  });
  it("απορρίπτει άλλο είδος με ελληνικό μήνυμα", () => {
    const result = createAgreementSchema.safeParse({
      opportunityId: ID,
      kind: "weekly",
      title: "",
    });
    expect(messageOf(result)).toBe("Διάλεξε μηνιαία ή εφάπαξ.");
  });
});

describe("basicsSchema", () => {
  const base = {
    agreementId: ID,
    title: " Πρόταση ",
    language: "el",
    validUntil: "2026-10-29",
    startOn: "2026-11-05",
    durationMonths: "6",
  };
  it("η Έναρξη με την υπογραφή δίνει null, όποια ημερομηνία κι αν υπάρχει", () => {
    const parsed = basicsSchema.parse({ ...base, startOnSignature: "on" });
    expect(parsed.startOn).toBeNull();
    expect(parsed.title).toBe("Πρόταση");
  });
  it("χωρίς το checkbox κρατά την Έναρξη", () => {
    expect(basicsSchema.parse(base)).toMatchObject({
      startOn: "2026-11-05",
      durationMonths: 6,
    });
  });
  it("χωρίς το checkbox η Έναρξη είναι υποχρεωτική", () => {
    expect(messageOf(basicsSchema.safeParse({ ...base, startOn: "" }))).toBe(
      "Γράψε την Έναρξη ή διάλεξε «με την υπογραφή».",
    );
  });
  it("η μηνιαία θέλει Διάρκεια 1–60", () => {
    for (const durationMonths of ["", "0", "61", "x"])
      expect(
        messageOf(basicsSchema.safeParse({ ...base, durationMonths })),
      ).toBe("Η Διάρκεια είναι από 1 έως 60 μήνες.");
  });
  it("η εφάπαξ δεν στέλνει Διάρκεια: null", () => {
    const oneOff = Object.fromEntries(
      Object.entries(base).filter(([key]) => key !== "durationMonths"),
    );
    expect(basicsSchema.parse(oneOff).durationMonths).toBeNull();
  });
  it("η Ισχύς θέλει πραγματική ημερομηνία", () => {
    for (const validUntil of ["", "29/10/2026", "2026-02-30"])
      expect(messageOf(basicsSchema.safeParse({ ...base, validUntil }))).toBe(
        "Γράψε την Ισχύς.",
      );
  });
  it("ο τίτλος δεν μένει κενός", () => {
    expect(messageOf(basicsSchema.safeParse({ ...base, title: "  " }))).toBe(
      "Γράψε τον τίτλο.",
    );
  });
});

describe("termsSchema", () => {
  const base = {
    agreementId: ID,
    paymentDays: "15",
    unusedProvisions: "next_period",
    graceDays: "10",
    renewal: "new_opportunity",
    dissolutionNoticeDays: "30",
    filmingNoticeHours: "48",
    filmingCancelHours: "24",
  };
  it("απορρίπτει άγνωστη τιμή αχρησιμοποίητων Παροχών", () => {
    expect(
      termsSchema.safeParse({ ...base, unusedProvisions: "x" }).success,
    ).toBe(false);
  });
  it("τα checkbox που λείπουν είναι false", () => {
    const parsed = termsSchema.parse(base);
    expect([parsed.lateCancelBurns, parsed.noShowBurns]).toEqual([
      false,
      false,
    ]);
    expect(
      termsSchema.parse({ ...base, lateCancelBurns: "on" }).lateCancelBurns,
    ).toBe(true);
  });
  it("τα πεδία μόνο της μηνιαίας μπορούν να λείπουν (εφάπαξ): null", () => {
    const parsed = termsSchema.parse({
      ...base,
      unusedProvisions: "",
      graceDays: "",
      renewal: "",
      dissolutionNoticeDays: "",
    });
    expect([
      parsed.unusedProvisions,
      parsed.graceDays,
      parsed.renewal,
      parsed.dissolutionNoticeDays,
    ]).toEqual([null, null, null, null]);
  });
  it("τα όρια των ημερών και των ωρών", () => {
    expect(termsSchema.safeParse({ ...base, paymentDays: "366" }).success).toBe(
      false,
    );
    expect(
      termsSchema.safeParse({ ...base, filmingNoticeHours: "721" }).success,
    ).toBe(false);
    expect(termsSchema.safeParse({ ...base, paymentDays: "-1" }).success).toBe(
      false,
    );
  });
});

describe("termsSchema: μηνιαία", () => {
  const base = {
    agreementId: ID,
    kind: "monthly",
    paymentDays: "15",
    unusedProvisions: "next_period",
    graceDays: "10",
    renewal: "new_opportunity",
    dissolutionNoticeDays: "30",
    filmingNoticeHours: "48",
    filmingCancelHours: "24",
  };
  const messagesOf = (input: object): Record<string, string> => {
    const result = termsSchema.safeParse(input);
    return Object.fromEntries(
      (result.error?.issues ?? []).map((i) => [String(i.path[0]), i.message]),
    );
  };
  it("δέχεται πλήρη πεδία", () => {
    expect(termsSchema.safeParse(base).success).toBe(true);
  });
  it("απορρίπτει κενά πεδία μόνο της μηνιαίας με ελληνικό μήνυμα στο πεδίο", () => {
    expect(
      messagesOf({
        ...base,
        graceDays: "",
        dissolutionNoticeDays: "",
        unusedProvisions: "",
        renewal: "",
      }),
    ).toEqual({
      graceDays: "Γράψε την Περίοδο χάριτος.",
      dissolutionNoticeDays: "Γράψε την Ειδοποίηση λύσης.",
      unusedProvisions: "Διάλεξε τι γίνεται με τις αχρησιμοποίητες Παροχές.",
      renewal: "Διάλεξε τι γίνεται στη λήξη.",
    });
  });
  it("η εφάπαξ δέχεται τα κενά", () => {
    const parsed = termsSchema.parse({
      ...base,
      kind: "one_off",
      graceDays: "",
      dissolutionNoticeDays: "",
      unusedProvisions: "",
      renewal: "",
    });
    expect(parsed.graceDays).toBeNull();
  });
});

describe("moneyTermsSchema", () => {
  const base = {
    agreementId: ID,
    discountPercent: "10",
    discountMonths: "2",
    dissolutionFee: "0",
  };
  it("δέχεται έκπτωση με ποσοστό και μήνες, με κόμμα", () => {
    expect(
      moneyTermsSchema.parse({ ...base, discountPercent: "12,5" }),
    ).toMatchObject({ discountPercent: 12.5, discountMonths: 2 });
  });
  it("απορρίπτει 10% με 0 μήνες και το αντίστροφο", () => {
    const result = moneyTermsSchema.safeParse({ ...base, discountMonths: "0" });
    expect(messageOf(result)).toBe("Η έκπτωση θέλει και ποσοστό και μήνες.");
    expect(
      moneyTermsSchema.safeParse({ ...base, discountPercent: "0" }).success,
    ).toBe(false);
  });
  it("δέχεται καθόλου έκπτωση", () => {
    expect(
      moneyTermsSchema.safeParse({
        ...base,
        discountPercent: "0",
        discountMonths: "0",
      }).success,
    ).toBe(true);
  });
  it("το ποσοστό δεν περνά το 100 και το αμφίσημο ποσό ζητά διόρθωση", () => {
    expect(
      moneyTermsSchema.safeParse({ ...base, discountPercent: "101" }).success,
    ).toBe(false);
    expect(
      messageOf(
        moneyTermsSchema.safeParse({ ...base, dissolutionFee: "1.300" }),
      ),
    ).toBe("Γράψε το ποσό χωρίς τελεία χιλιάδων, π.χ. 1300 ή 1300,50.");
  });
});

describe("γραμμές", () => {
  it("addCatalogueLineSchema: ποσότητα 1–999", () => {
    const line = { agreementId: ID, itemId: OTHER };
    expect(
      addCatalogueLineSchema.parse({ ...line, quantity: "3" }).quantity,
    ).toBe(3);
    expect(
      addCatalogueLineSchema.safeParse({ ...line, quantity: "0" }).success,
    ).toBe(false);
    expect(
      addCatalogueLineSchema.safeParse({ ...line, quantity: "1000" }).success,
    ).toBe(false);
  });
  it("addFreeLineSchema: περιγραφή και ποσό", () => {
    const parsed = addFreeLineSchema.parse({
      agreementId: ID,
      description: " Ειδικό βίντεο ",
      descriptionEn: "",
      price: "300",
    });
    expect(parsed).toMatchObject({ description: "Ειδικό βίντεο", price: 300 });
    expect(
      messageOf(
        addFreeLineSchema.safeParse({
          agreementId: ID,
          description: "",
          descriptionEn: "",
          price: "300",
        }),
      ),
    ).toBe("Γράψε την περιγραφή.");
  });
  it("updateLineSchema: ό,τι λείπει μένει undefined (δεν αλλάζει)", () => {
    const parsed = updateLineSchema.parse({ lineId: ID });
    expect(parsed).toEqual({
      lineId: ID,
      quantity: undefined,
      description: undefined,
      descriptionEn: undefined,
      unitPrice: undefined,
      hoursShoot: undefined,
      hoursEdit: undefined,
      directCost: undefined,
    });
  });
  it("updateLineSchema: διαβάζει τιμή, ώρες και κόστος", () => {
    const parsed = updateLineSchema.parse({
      lineId: ID,
      unitPrice: "1300,50",
      hoursShoot: "6,5",
      hoursEdit: "4",
      directCost: "0",
      quantity: "2",
    });
    expect(parsed).toMatchObject({
      unitPrice: 1300.5,
      hoursShoot: 6.5,
      hoursEdit: 4,
      directCost: 0,
      quantity: 2,
    });
  });
  it("updateLineSchema: ώρες με δύο δεκαδικά απορρίπτονται", () => {
    expect(
      updateLineSchema.safeParse({ lineId: ID, hoursShoot: "6,55" }).success,
    ).toBe(false);
  });
});
