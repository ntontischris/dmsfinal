import { describe, expect, it } from "vitest";

import {
  activeKinds,
  filterRows,
  isAmbiguousGrouping,
  nextSort,
  parseDecimal,
  priceSuffix,
  priceText,
  provisionsText,
  publicPriceText,
  toCatalogueRow,
} from "./helpers";
import type {
  CatalogueItem,
  CatalogueRow,
  CostHint,
  ProvisionKind,
} from "./types";

const NBSP = " ";
const UUID_A = "11111111-1111-4111-8111-111111111111";
const SHOOT = "22222222-2222-4222-8222-222222222222";
const REEL = "33333333-3333-4333-8333-333333333333";

const KINDS: ProvisionKind[] = [
  {
    id: REEL,
    code: "reel",
    label: "reel",
    labelEn: "Reel",
    unit: "reels",
    unitEn: "reels",
    measure: null,
    defaultHours: null,
    sort: 20,
    isRetired: false,
  },
  {
    id: SHOOT,
    code: "shoot",
    label: "Γύρισμα",
    labelEn: "Shoot",
    unit: "Γυρίσματα",
    unitEn: "shoots",
    measure: "per_filming",
    defaultHours: 4,
    sort: 10,
    isRetired: false,
  },
];

const item = (changes: Partial<CatalogueItem> = {}): CatalogueItem => ({
  id: UUID_A,
  kind: "package",
  billing: "monthly",
  name: "Social A",
  nameEn: "",
  description: "",
  unit: "",
  isPublic: false,
  showsPrice: false,
  descriptionPublic: "",
  descriptionPublicEn: "",
  isRetired: false,
  price: 1300,
  hoursShoot: 6,
  hoursEdit: 14,
  directCost: 0,
  directCostNote: "",
  provisions: [
    { kindId: SHOOT, quantity: 2 },
    { kindId: REEL, quantity: 8 },
  ],
  uses: 0,
  updatedAt: "2026-10-08T10:00:00Z",
  updatedByName: null,
  ...changes,
});

const HINT: CostHint = {
  hourCostMonth: "2026-10-01",
  hourCost: 40,
  multipliers: { min: 1.3, target: 1.6, max: 2 },
};

describe("τιμή", () => {
  const service = item({
    kind: "service",
    billing: null,
    unit: "ανά reel",
    price: 150,
  });
  it("priceSuffix ανά είδος", () => {
    expect(priceSuffix(item())).toBe("/ μήνα");
    expect(priceSuffix(item({ billing: "one_off" }))).toBe("εφάπαξ");
    expect(priceSuffix(service)).toBe("ανά reel");
  });
  it("priceText κρατά το κενό χωρίς διάσπαση", () => {
    expect(priceText(item())).toBe(`1.300,00${NBSP}€ / μήνα`);
    expect(priceText(item({ billing: "one_off", price: 400 }))).toBe(
      `400,00${NBSP}€ εφάπαξ`,
    );
    expect(priceText(service)).toBe(`150,00${NBSP}€ ανά reel`);
  });
  it("priceText και publicPriceText δίνουν null όταν η τιμή κρύβεται", () => {
    expect(priceText(item({ price: null }))).toBeNull();
    expect(publicPriceText(item({ price: null }))).toBeNull();
  });
  it("publicPriceText γράφει «από … + ΦΠΑ»", () => {
    expect(publicPriceText(item())).toBe(`από 1.300,00${NBSP}€ + ΦΠΑ`);
  });
});

describe("Παροχές", () => {
  it("provisionsText γράφει ποσότητα και μονάδα με τη σειρά που δόθηκαν", () => {
    expect(
      provisionsText(
        [
          { kindId: SHOOT, quantity: 2 },
          { kindId: REEL, quantity: 8 },
        ],
        KINDS,
      ),
    ).toBe("2 Γυρίσματα, 8 reels");
  });
  it("provisionsText γράφει ενικό όταν η ποσότητα είναι 1", () => {
    expect(
      provisionsText(
        [
          { kindId: SHOOT, quantity: 1 },
          { kindId: REEL, quantity: 1 },
        ],
        KINDS,
      ),
    ).toBe("1 Γύρισμα, 1 reel");
  });
  it("άγνωστο είδος και κενή λίστα δείχνουν «—»", () => {
    expect(
      provisionsText(
        [{ kindId: "99999999-9999-4999-8999-999999999999", quantity: 1 }],
        KINDS,
      ),
    ).toBe("—");
    expect(provisionsText([], KINDS)).toBe("—");
  });
  it("activeKinds αφήνει έξω τα αποσυρμένα και ταξινομεί", () => {
    const retired = {
      ...KINDS[0]!,
      id: "44444444-4444-4444-8444-444444444444",
      isRetired: true,
    };
    expect(activeKinds([...KINDS, retired]).map((kind) => kind.code)).toEqual([
      "shoot",
      "reel",
    ]);
  });
  it("nextSort προσθέτει 10 στο μεγαλύτερο", () => {
    expect(nextSort([{ sort: 10 }, { sort: 30 }])).toBe(40);
    expect(nextSort([])).toBe(10);
  });
});

describe("toCatalogueRow", () => {
  it("φτιάχνει τη γραμμή με κόστος και περιθώριο", () => {
    const row = toCatalogueRow(item(), { kinds: KINDS, hint: HINT });
    expect(row.href).toBe(`/app/catalogue/${UUID_A}`);
    expect(row.kindLabel).toBe("Πακέτο μηνιαίο");
    expect(row.provisions).toBe("2 Γυρίσματα, 8 reels");
    expect(row.price).toBe(`1.300,00${NBSP}€ / μήνα`);
    expect(row.cost).toBe(`800,00${NBSP}€`);
    expect(row.margin).toBe(`500,00${NBSP}€ · 38,5%`);
    expect(row.isBelowMin).toBe(false);
  });
  it("τιμή κάτω από το ελάχιστο σημαίνεται", () => {
    const row = toCatalogueRow(item({ price: 1000 }), {
      kinds: KINDS,
      hint: HINT,
    });
    expect(row.isBelowMin).toBe(true);
  });
  it("χωρίς δικαίωμα κόστους δεν έχει κόστος ούτε περιθώριο", () => {
    const row = toCatalogueRow(item({ hoursShoot: null, hoursEdit: null }), {
      kinds: KINDS,
      hint: HINT,
    });
    expect(row.cost).toBeNull();
    expect(row.margin).toBeNull();
  });
  it("χωρίς Κόστος ώρας δεν υπολογίζεται κόστος", () => {
    const missing = toCatalogueRow(item(), {
      kinds: KINDS,
      hint: { ...HINT, hourCost: null },
    });
    expect(missing.cost).toBeNull();
    expect(
      toCatalogueRow(item(), { kinds: KINDS, hint: null }).cost,
    ).toBeNull();
  });
  it("χωρίς τιμή (κρυφή) φαίνεται το κόστος αλλά όχι το περιθώριο", () => {
    const row = toCatalogueRow(item({ price: null }), {
      kinds: KINDS,
      hint: HINT,
    });
    expect(row.price).toBeNull();
    expect(row.cost).toBe(`800,00${NBSP}€`);
    expect(row.margin).toBeNull();
  });
  it("με 0 ώρες και 0 Άμεσο κόστος το κελί του κόστους είναι «—»", () => {
    const row = toCatalogueRow(item({ hoursShoot: 0, hoursEdit: 0 }), {
      kinds: KINDS,
      hint: HINT,
    });
    expect(row.cost).toBe("—");
    expect(row.isBelowMin).toBe(false);
  });
});

describe("filterRows", () => {
  const rows: CatalogueRow[] = [
    {
      ...toCatalogueRow(item({ name: "Εκδήλωση" }), {
        kinds: KINDS,
        hint: null,
      }),
    },
    {
      ...toCatalogueRow(
        item({
          name: "Podcast",
          kind: "service",
          billing: null,
          unit: "ανά επεισόδιο",
        }),
        { kinds: KINDS, hint: null },
      ),
    },
    {
      ...toCatalogueRow(item({ name: "Παλιό", isRetired: true }), {
        kinds: KINDS,
        hint: null,
      }),
    },
  ];
  const all = { query: "", kind: "all" as const, withRetired: true };
  it("η αναζήτηση δεν θέλει τόνους ούτε κεφαλαία", () => {
    expect(
      filterRows(rows, { ...all, query: "εκδηλωση" }).map((r) => r.name),
    ).toEqual(["Εκδήλωση"]);
  });
  it("φιλτράρει Πακέτα και Υπηρεσίες", () => {
    expect(
      filterRows(rows, { ...all, kind: "service" }).map((r) => r.name),
    ).toEqual(["Podcast"]);
    expect(filterRows(rows, { ...all, kind: "package" })).toHaveLength(2);
  });
  it("τα αρχειοθετημένα φαίνονται μόνο όταν ζητηθούν", () => {
    expect(filterRows(rows, { ...all, withRetired: false })).toHaveLength(2);
    expect(filterRows(rows, all)).toHaveLength(3);
  });
});

describe("parseDecimal", () => {
  it("δέχεται κόμμα ή τελεία", () => {
    expect(parseDecimal("1300,5")).toBe(1300.5);
    expect(parseDecimal("1300.5")).toBe(1300.5);
  });
  it("το αμφίσημο, το κενό και τα γράμματα δίνουν null", () => {
    expect(parseDecimal("1.300,5")).toBeNull();
    expect(parseDecimal("")).toBeNull();
    expect(parseDecimal("abc")).toBeNull();
  });
  it("αγνοεί κενά γύρω και δέχεται αρνητικά (τα απορρίπτει το schema)", () => {
    expect(parseDecimal(" 12 ")).toBe(12);
    expect(parseDecimal("-3")).toBe(-3);
  });
  it("απορρίπτει τελεία ή κόμμα με ακριβώς τρία ψηφία μετά (αμφίσημο με χιλιάδες)", () => {
    expect(parseDecimal("1.300")).toBeNull();
    expect(parseDecimal("1,300")).toBeNull();
    expect(parseDecimal("12.500")).toBeNull();
    expect(parseDecimal("999,999")).toBeNull();
    expect(parseDecimal(" 12,500 ")).toBeNull();
  });
  it("τα καθαρά ποσά διαβάζονται κανονικά", () => {
    expect(parseDecimal("1300")).toBe(1300);
    expect(parseDecimal("1300,5")).toBe(1300.5);
    expect(parseDecimal("1300.50")).toBe(1300.5);
    expect(parseDecimal("0,5")).toBe(0.5);
  });
  it("δεν είναι αμφίσημο ό,τι δεν μοιάζει με ομάδα χιλιάδων", () => {
    // ο ακέραιος των 4+ ψηφίων ή το μηδέν μπροστά δεν είναι ποτέ ομάδα χιλιάδων
    expect(parseDecimal("1300,500")).toBe(1300.5);
    expect(parseDecimal("0,125")).toBe(0.125);
    expect(parseDecimal("1,25")).toBe(1.25);
    expect(parseDecimal("1,2345")).toBe(1.2345);
  });
});

describe("isAmbiguousGrouping", () => {
  it("αναγνωρίζει μόνο το αμφίσημο σχήμα", () => {
    expect(isAmbiguousGrouping("1.300")).toBe(true);
    expect(isAmbiguousGrouping(" 12,500 ")).toBe(true);
    expect(isAmbiguousGrouping("1300")).toBe(false);
    expect(isAmbiguousGrouping("1.300,50")).toBe(false);
    expect(isAmbiguousGrouping("abc")).toBe(false);
  });
});
