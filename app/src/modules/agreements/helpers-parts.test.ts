import { describe, expect, it } from "vitest";

import {
  activeKinds,
  describeDeviation,
  milestoneText,
  provisionsText,
  sortOptions,
} from "./helpers";
import type { CatalogueOption, Deviation, KindInfo } from "./types";

const NBSP = String.fromCharCode(0xa0);

const deviation = (over: Partial<Deviation>): Deviation => ({
  key: "k",
  kind: "price",
  subject: "Μηνιαία Παρουσία",
  depth: 100,
  baseValue: "1300.00",
  value: "1200.00",
  status: "new",
  ...over,
});

describe("describeDeviation", () => {
  it("ελεύθερη γραμμή", () => {
    expect(
      describeDeviation(
        deviation({ kind: "free_line", subject: "Βίντεο" }),
        true,
      ),
    ).toBe("Ελεύθερη γραμμή: «Βίντεο»");
  });
  it("τιμή: με ποσά δείχνει από → σε, χωρίς ποσά την απλή πρόταση", () => {
    expect(describeDeviation(deviation({}), true)).toBe(
      `Τιμή κάτω από τον Κατάλογο: «Μηνιαία Παρουσία» (1.300,00${NBSP}€ → 1.200,00${NBSP}€)`,
    );
    expect(describeDeviation(deviation({}), false)).toBe(
      "Τιμή κάτω από τον Κατάλογο: «Μηνιαία Παρουσία»",
    );
  });
  it("περισσότερες Παροχές", () => {
    expect(describeDeviation(deviation({ kind: "provisions" }), false)).toBe(
      "Περισσότερες Παροχές από τον Κατάλογο: «Μηνιαία Παρουσία»",
    );
  });
  it("έκπτωση ποσοστού και μηνών", () => {
    expect(
      describeDeviation(
        deviation({ kind: "discount_percent", baseValue: "10", value: "25" }),
        false,
      ),
    ).toBe("Έκπτωση 25% αντί για την τυπική 10%");
    expect(
      describeDeviation(
        deviation({ kind: "discount_months", baseValue: "2", value: "4" }),
        false,
      ),
    ).toBe("Έκπτωση για 4 μήνες αντί για την τυπική 2");
  });
  it("όροι πληρωμής και χάριτος", () => {
    expect(
      describeDeviation(
        deviation({ kind: "payment_days", baseValue: "15", value: "45" }),
        false,
      ),
    ).toBe("Μέρες πληρωμής 45 αντί για 15");
    expect(
      describeDeviation(
        deviation({ kind: "grace_days", baseValue: "10", value: "20" }),
        false,
      ),
    ).toBe("Περίοδος χάριτος 20 μέρες αντί για 10");
  });
  it("αχρησιμοποίητες Παροχές με τις ετικέτες των κωδικών", () => {
    expect(
      describeDeviation(
        deviation({
          kind: "unused_provisions",
          baseValue: "next_period",
          value: "accumulate",
        }),
        false,
      ),
    ).toBe(
      "Αχρησιμοποίητες Παροχές «μαζεύονται» αντί για «περνούν στην επόμενη Περίοδο»",
    );
  });
  it("ειδοποίηση λύσης και ρήτρα: η ρήτρα με ποσά μόνο όταν επιτρέπεται", () => {
    expect(
      describeDeviation(
        deviation({ kind: "dissolution_notice", baseValue: "30", value: "7" }),
        false,
      ),
    ).toBe("Ειδοποίηση λύσης 7 μέρες αντί για 30");
    expect(
      describeDeviation(
        deviation({ kind: "dissolution_fee", baseValue: "500", value: "0" }),
        true,
      ),
    ).toBe(`Ρήτρα λύσης 0,00${NBSP}€ αντί για 500,00${NBSP}€`);
    expect(
      describeDeviation(
        deviation({ kind: "dissolution_fee", baseValue: null, value: null }),
        false,
      ),
    ).toBe("Ρήτρα λύσης κάτω από την τυπική");
  });
  it("πολιτική Γυρισμάτων", () => {
    expect(
      describeDeviation(
        deviation({ kind: "filming_notice", baseValue: "48", value: "12" }),
        false,
      ),
    ).toBe("Ελάχιστη προειδοποίηση κράτησης 12 ώρες αντί για 48");
    expect(
      describeDeviation(
        deviation({ kind: "cancel_hours", baseValue: "24", value: "2" }),
        false,
      ),
    ).toBe("Όριο ακύρωσης 2 ώρες αντί για 24");
    expect(
      describeDeviation(deviation({ kind: "late_cancel_burns" }), false),
    ).toBe("Η αργή ακύρωση δεν καίει Παροχή");
    expect(describeDeviation(deviation({ kind: "no_show_burns" }), false)).toBe(
      "Το «δεν έγινε» δεν καίει Παροχή",
    );
  });
  it("όριο αλλαγών και προκαταβολή", () => {
    expect(
      describeDeviation(
        deviation({
          kind: "revision_limit",
          subject: "reel",
          baseValue: "2",
          value: "4",
        }),
        false,
      ),
    ).toBe("Όριο αλλαγών reel: 4 γύροι αντί για 2");
    expect(
      describeDeviation(
        deviation({ kind: "advance", baseValue: "50", value: "20" }),
        false,
      ),
    ).toBe("Προκαταβολή 20% αντί για 50%");
  });
});

describe("milestoneText", () => {
  it("δόση στην υπογραφή χωρίς ποσό", () => {
    expect(
      milestoneText({
        id: "m1",
        trigger: "signature",
        percent: 40,
        dueOn: null,
        amount: null,
      }),
    ).toBe("40% · Υπογραφή");
  });
  it("δόση με ημερομηνία και ποσό", () => {
    expect(
      milestoneText({
        id: "m2",
        trigger: "date",
        percent: 30,
        dueOn: "2026-11-12",
        amount: 480,
      }),
    ).toBe(`30% · 12/11/2026 · 480,00${NBSP}€`);
  });
});

const option = (
  name: string,
  kind: CatalogueOption["kind"],
): CatalogueOption => ({
  itemId: name,
  kind,
  billing: null,
  name,
  unit: "",
  price: null,
  provisions: [],
});

describe("sortOptions", () => {
  it("πρώτα τα Πακέτα, μετά οι Υπηρεσίες, με αλφαβητική σειρά", () => {
    const sorted = sortOptions([
      option("Βίντεο", "service"),
      option("Ωραίο Πακέτο", "package"),
      option("Αφίσα", "service"),
      option("Άλφα Πακέτο", "package"),
    ]);
    expect(sorted.map((o) => o.name)).toEqual([
      "Άλφα Πακέτο",
      "Ωραίο Πακέτο",
      "Αφίσα",
      "Βίντεο",
    ]);
  });
});

const kind = (id: string, over: Partial<KindInfo> = {}): KindInfo => ({
  id,
  label: `Ετικέτα ${id}`,
  labelEn: "",
  unit: `Μονάδες ${id}`,
  unitEn: "",
  sort: 10,
  isRetired: false,
  revisionLimit: null,
  ...over,
});

describe("activeKinds", () => {
  it("αφήνει όσα δεν έχουν αποσυρθεί, με σειρά sort και μετά id", () => {
    const kinds = [
      kind("b", { sort: 20 }),
      kind("z", { isRetired: true, sort: 1 }),
      kind("c", { sort: 10 }),
      kind("a", { sort: 10 }),
    ];
    expect(activeKinds(kinds).map((k) => k.id)).toEqual(["a", "c", "b"]);
  });
});

describe("provisionsText", () => {
  const kinds = [
    kind("shoot", { label: "Γύρισμα", unit: "Γυρίσματα" }),
    kind("reel", { label: "reel", unit: "reels" }),
  ];
  it("ενικός με την ετικέτα, πληθυντικός με τη μονάδα", () => {
    expect(
      provisionsText(
        [
          { kindId: "shoot", quantity: 2 },
          { kindId: "reel", quantity: 8 },
        ],
        kinds,
      ),
    ).toBe("2 Γυρίσματα, 8 reels");
    expect(provisionsText([{ kindId: "shoot", quantity: 1 }], kinds)).toBe(
      "1 Γύρισμα",
    );
  });
  it("άγνωστο είδος και κενή λίστα δίνουν «—»", () => {
    expect(provisionsText([{ kindId: "zz", quantity: 3 }], kinds)).toBe("—");
    expect(provisionsText([], kinds)).toBe("—");
  });
});

