import { describe, expect, it } from "vitest";

import type {
  AgreementDetail,
  AgreementLine,
  Can,
  CatalogueOption,
  KindInfo,
  PeriodRow,
  Recipient,
} from "../types";
import {
  firstOpenStep,
  longDate,
  offerLine,
  optionLine,
  packagesFor,
  parseVariant,
  peopleLine,
  scheduleSentence,
  termChanges,
  termsLine,
  warningsOf,
} from "./d2-proto-model";

const kind = (
  id: string,
  label: string,
  unit: string,
  sort: number,
): KindInfo => ({
  id,
  label,
  labelEn: label,
  unit,
  unitEn: unit,
  sort,
  isRetired: false,
  revisionLimit: null,
});

const KINDS = [
  kind("photo", "Φωτογραφία", "Φωτογραφίες", 3),
  kind("shoot", "Γύρισμα", "Γυρίσματα", 1),
  kind("reel", "Reel", "Reels", 2),
];

const line = (patch: Partial<AgreementLine> = {}): AgreementLine => ({
  id: "l1",
  position: 1,
  kind: "package",
  itemId: "p1",
  description: "Social B",
  descriptionEn: "",
  unit: "μήνας",
  quantity: 1,
  unitPrice: 650,
  catalogPrice: 650,
  lineTotal: 650,
  hoursShoot: null,
  hoursEdit: null,
  directCost: null,
  provisions: [
    { kindId: "shoot", quantity: 2 },
    { kindId: "reel", quantity: 4 },
    { kindId: "photo", quantity: 10 },
  ] as AgreementLine["provisions"],
  ...patch,
});

const period = (patch: Partial<PeriodRow>): PeriodRow => ({
  n: 1,
  starts: "2026-11-10",
  ends: "2026-11-30",
  isPartial: false,
  givesProvisions: true,
  isDiscounted: false,
  state: "next",
  amount: 650,
  productionId: null,
  ...patch,
});

const recipient = (name: string, isSignatory: boolean): Recipient => ({
  id: name,
  name,
  email: `${name}@example.com`,
  isSignatory,
  link: null,
});

const TERMS: AgreementDetail["terms"] = {
  paymentDays: 15,
  unusedProvisions: "lost",
  graceDays: 5,
  renewal: "new_opportunity",
  dissolutionNoticeDays: 30,
  filmingNoticeHours: 48,
  filmingCancelHours: 24,
  lateCancelBurns: true,
  noShowBurns: true,
};

const BASELINE: NonNullable<AgreementDetail["baseline"]> = {
  ...TERMS,
  dissolutionFee: null,
  standardDiscountPercent: 0,
  standardDiscountMonths: 0,
  advancePercent: 0,
};

describe("parseVariant", () => {
  it("should accept only a, b and c", () => {
    expect(parseVariant("b")).toBe("b");
    expect(parseVariant("d")).toBeNull();
    expect(parseVariant(undefined)).toBeNull();
  });
});

describe("longDate", () => {
  it("should write the month in the genitive", () => {
    expect(longDate("2027-05-09")).toBe("9 Μαΐου 2027");
  });
});

describe("offerLine", () => {
  it("should sum provisions in kind order and end with the monthly price", () => {
    const text = offerLine(
      {
        kind: "monthly",
        lines: [line()],
        totals: {
          price: 650,
          discountedPrice: 650,
          vatRate: 24,
          vat: 156,
          gross: 806,
        },
      },
      KINDS,
    );
    expect(text).toMatch(
      /^2 Γυρίσματα · 4 Reels · 10 Φωτογραφίες · 650,00\s€\/μήνα$/,
    );
  });

  it("should multiply provisions by the line quantity and use the singular for one", () => {
    const text = offerLine(
      {
        kind: "one_off",
        lines: [
          line({
            quantity: 1,
            provisions: [
              { kindId: "shoot", quantity: 1 },
            ] as AgreementLine["provisions"],
          }),
        ],
        totals: null,
      },
      KINDS,
    );
    expect(text).toBe("1 Γύρισμα");
  });
});

describe("packagesFor", () => {
  const option = (patch: Partial<CatalogueOption>): CatalogueOption => ({
    itemId: "x",
    kind: "package",
    billing: "monthly",
    name: "X",
    unit: "μήνας",
    price: 100,
    provisions: [],
    ...patch,
  });

  it("should keep only packages of the agreement kind, cheapest first", () => {
    const list = packagesFor(
      [
        option({ itemId: "b", price: 900 }),
        option({ itemId: "a", price: 400 }),
        option({ itemId: "s", kind: "service" }),
        option({ itemId: "o", billing: "one_off" }),
      ],
      "monthly",
    );
    expect(list.map((o) => o.itemId)).toEqual(["a", "b"]);
  });

  it("should describe an option in one line", () => {
    expect(
      optionLine(
        option({ provisions: [{ kindId: "reel", quantity: 4 }], price: null }),
        KINDS,
        "monthly",
      ),
    ).toBe("4 Reels");
  });
});

describe("scheduleSentence", () => {
  it("should say the end date and the prorated broken month", () => {
    const text = scheduleSentence({
      kind: "monthly",
      startOn: "2026-11-10",
      endOn: "2027-05-09",
      durationMonths: 6,
      periods: [
        period({ isPartial: true, amount: 455 }),
        period({ n: 2, starts: "2026-12-01" }),
      ],
    });
    expect(text).toMatch(
      /^6 μήνες, από 10 Νοεμβρίου 2026 ως 9 Μαΐου 2027· ο Νοέμβριος χρεώνεται αναλογικά 455,00\s€\.$/,
    );
  });

  it("should compute the end when the database has not yet", () => {
    expect(
      scheduleSentence({
        kind: "monthly",
        startOn: "2026-12-01",
        endOn: null,
        durationMonths: 6,
        periods: [],
      }),
    ).toBe("6 μήνες, από 1 Δεκεμβρίου 2026 ως 31 Μαΐου 2027.");
  });

  it("should start with the signature when there is no start date", () => {
    expect(
      scheduleSentence({
        kind: "monthly",
        startOn: null,
        endOn: null,
        durationMonths: 1,
        periods: [],
      }),
    ).toMatch(/^1 μήνας από την υπογραφή/);
  });

  it("should describe a one-off without a duration", () => {
    expect(
      scheduleSentence({
        kind: "one_off",
        startOn: null,
        endOn: null,
        durationMonths: null,
        periods: [],
      }),
    ).toMatch(/^Εφάπαξ/);
  });
});

describe("terms", () => {
  it("should call terms equal to the defaults «τυπικοί»", () => {
    expect(
      termsLine({ kind: "monthly", terms: TERMS, baseline: BASELINE }),
    ).toBe("τυπικοί");
  });

  it("should list only the changed terms with their default", () => {
    const terms = { ...TERMS, paymentDays: 30, graceDays: 10 };
    expect(termChanges({ kind: "monthly", terms, baseline: BASELINE })).toEqual(
      ["Πληρωμή 30 μέρες (τυπικά 15 μέρες)", "Χάρη 10 μέρες (τυπικά 5 μέρες)"],
    );
  });

  it("should ignore monthly-only terms on a one-off", () => {
    const terms = { ...TERMS, graceDays: 10 };
    expect(termsLine({ kind: "one_off", terms, baseline: BASELINE })).toBe(
      "τυπικοί",
    );
  });
});

describe("people", () => {
  it("should name the signatory and count the others", () => {
    expect(
      peopleLine([recipient("Μαρία", true), recipient("Νίκος", false)]),
    ).toBe("Υπογράφει Μαρία · +1 παραλήπτης");
    expect(peopleLine([])).toBe("Δεν ορίστηκε Υπογράφων");
  });
});

describe("warningsOf and firstOpenStep", () => {
  const base = {
    state: "proposal",
    path: "draft",
    lines: [line()],
    cost: null,
    deviations: [],
    needsApproval: false,
    recipients: [recipient("Μαρία", true)],
    kind: "monthly",
    milestones: [],
    milestonesTotal: 0,
    can: { edit: true, seeAmounts: true } as Can,
  } as const satisfies Parameters<typeof warningsOf>[0];

  it("should be quiet when nothing is wrong", () => {
    expect(warningsOf(base)).toEqual([]);
    expect(firstOpenStep(base)).toBe(2);
  });

  it("should warn about low margin and a missing signatory", () => {
    const keys = warningsOf({
      ...base,
      recipients: [],
      cost: {
        hourCost: 40,
        hourCostMonth: null,
        estimatedCost: 600,
        multiplierMin: 1.3,
        multiplierTarget: 1.6,
        multiplierMax: 2,
        isLowMargin: true,
        isFrozen: false,
      },
    }).map((w) => w.key);
    expect(keys).toEqual(["margin", "signatory"]);
    expect(firstOpenStep({ ...base, recipients: [] })).toBe(1);
  });

  it("should open on the first step when nothing is sold yet", () => {
    expect(firstOpenStep({ ...base, lines: [] })).toBe(0);
  });

  it("should not warn on a signed agreement", () => {
    expect(warningsOf({ ...base, state: "active", recipients: [] })).toEqual(
      [],
    );
  });
});
