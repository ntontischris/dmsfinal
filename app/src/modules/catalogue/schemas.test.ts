import { describe, expect, it } from "vitest";

import {
  createItemSchema,
  itemRefSchema,
  moneySchema,
  provisionsFieldSchema,
  setCostSchema,
  setProvisionsSchema,
  setPublicSchema,
  updateItemSchema,
} from "./schemas";

const ITEM = "11111111-1111-4111-8111-111111111111";
const SHOOT = "22222222-2222-4222-8222-222222222222";
const REEL = "33333333-3333-4333-8333-333333333333";

const provisions = (list: readonly { kindId: string; quantity: number }[]) =>
  JSON.stringify(list);

describe("provisionsFieldSchema", () => {
  it("διαβάζει έγκυρες Παροχές", () => {
    const result = provisionsFieldSchema.safeParse(
      provisions([{ kindId: SHOOT, quantity: 2 }]),
    );
    expect(result.success && result.data).toEqual([
      { kindId: SHOOT, quantity: 2 },
    ]);
  });
  it("απορρίπτει μη έγκυρο JSON", () => {
    expect(provisionsFieldSchema.safeParse("{oops").success).toBe(false);
  });
  it("απορρίπτει ποσότητα 0 και 1000", () => {
    expect(
      provisionsFieldSchema.safeParse(
        provisions([{ kindId: SHOOT, quantity: 0 }]),
      ).success,
    ).toBe(false);
    expect(
      provisionsFieldSchema.safeParse(
        provisions([{ kindId: SHOOT, quantity: 1000 }]),
      ).success,
    ).toBe(false);
  });
  it("απορρίπτει το ίδιο είδος δύο φορές", () => {
    const result = provisionsFieldSchema.safeParse(
      provisions([
        { kindId: SHOOT, quantity: 1 },
        { kindId: SHOOT, quantity: 2 },
      ]),
    );
    expect(result.success).toBe(false);
  });
  it("απορρίπτει kindId που δεν είναι uuid", () => {
    expect(
      provisionsFieldSchema.safeParse(
        provisions([{ kindId: "x", quantity: 1 }]),
      ).success,
    ).toBe(false);
  });
  it("το κενό πεδίο σημαίνει καμία Παροχή", () => {
    const result = provisionsFieldSchema.safeParse("");
    expect(result.success && result.data).toEqual([]);
  });
});

describe("moneySchema", () => {
  it("δέχεται 0 και ποσά με κόμμα", () => {
    expect(moneySchema.safeParse("0").success).toBe(true);
    const result = moneySchema.safeParse("1300,50");
    expect(result.success && result.data).toBe(1300.5);
  });
  it("απορρίπτει γράμματα και αρνητικά", () => {
    expect(moneySchema.safeParse("abc").success).toBe(false);
    expect(moneySchema.safeParse("-1").success).toBe(false);
  });
});

describe("createItemSchema", () => {
  const monthly = {
    type: "package_monthly",
    name: " Social A ",
    description: "",
    unit: "",
    price: "1300,50",
    provisions: provisions([{ kindId: SHOOT, quantity: 2 }]),
  };
  it("δέχεται μηνιαίο Πακέτο με μία Παροχή και τιμή με κόμμα", () => {
    const result = createItemSchema.safeParse(monthly);
    expect(result.success && result.data.price).toBe(1300.5);
    expect(result.success && result.data.name).toBe("Social A");
  });
  it("δέχεται Υπηρεσία με μονάδα και χωρίς Παροχές", () => {
    const result = createItemSchema.safeParse({
      ...monthly,
      type: "service",
      unit: "ανά reel",
      provisions: "[]",
    });
    expect(result.success).toBe(true);
  });
  it("δέχεται απουσία τιμής (ο δημιουργός δεν βλέπει τιμές)", () => {
    const withoutPrice = { ...monthly, price: undefined };
    const result = createItemSchema.safeParse(withoutPrice);
    expect(result.success && result.data.price).toBeUndefined();
  });
  it("απορρίπτει Πακέτο χωρίς Παροχές", () => {
    const result = createItemSchema.safeParse({ ...monthly, provisions: "[]" });
    expect(!result.success && result.error.issues[0]?.message).toBe(
      "Ένα Πακέτο έχει τουλάχιστον μία Παροχή.",
    );
  });
  it("απορρίπτει Υπηρεσία χωρίς μονάδα", () => {
    const result = createItemSchema.safeParse({
      ...monthly,
      type: "service",
      provisions: "[]",
    });
    expect(!result.success && result.error.issues[0]?.message).toBe(
      "Η Υπηρεσία θέλει μονάδα, π.χ. ανά reel.",
    );
  });
  it("απορρίπτει άγνωστο είδος", () => {
    expect(
      createItemSchema.safeParse({ ...monthly, type: "bundle" }).success,
    ).toBe(false);
  });
  it("απορρίπτει κενό όνομα", () => {
    expect(createItemSchema.safeParse({ ...monthly, name: "  " }).success).toBe(
      false,
    );
  });
});

describe("updateItemSchema", () => {
  const base = { itemId: ITEM, name: "Social A", description: "", unit: "" };
  it("η απούσα και η κενή τιμή σημαίνουν «δεν αλλάζει»", () => {
    const missing = updateItemSchema.safeParse(base);
    const empty = updateItemSchema.safeParse({ ...base, price: "" });
    expect(missing.success && missing.data.price).toBeUndefined();
    expect(empty.success && empty.data.price).toBeUndefined();
  });
  it("διαβάζει την τιμή", () => {
    const result = updateItemSchema.safeParse({ ...base, price: "88,5" });
    expect(result.success && result.data.price).toBe(88.5);
  });
  it("απορρίπτει κενό όνομα και τιμή που δεν διαβάζεται", () => {
    expect(updateItemSchema.safeParse({ ...base, name: " " }).success).toBe(
      false,
    );
    expect(updateItemSchema.safeParse({ ...base, price: "x" }).success).toBe(
      false,
    );
  });
});

describe("setProvisionsSchema και itemRefSchema", () => {
  it("δέχονται id και Παροχές", () => {
    expect(
      setProvisionsSchema.safeParse({
        itemId: ITEM,
        provisions: provisions([{ kindId: REEL, quantity: 8 }]),
      }).success,
    ).toBe(true);
    expect(itemRefSchema.safeParse({ itemId: ITEM }).success).toBe(true);
    expect(itemRefSchema.safeParse({ itemId: "x" }).success).toBe(false);
  });
});

describe("setCostSchema", () => {
  it("δέχεται μόνο τα πεδία που υπάρχουν", () => {
    const result = setCostSchema.safeParse({ itemId: ITEM, hoursShoot: "6,5" });
    expect(result.success && result.data).toEqual({
      itemId: ITEM,
      hoursShoot: 6.5,
      hoursEdit: undefined,
      directCost: undefined,
      directCostNote: undefined,
    });
  });
  it("απορρίπτει ώρες 1000 και «x»", () => {
    expect(
      setCostSchema.safeParse({ itemId: ITEM, hoursEdit: "1000" }).success,
    ).toBe(false);
    expect(
      setCostSchema.safeParse({ itemId: ITEM, hoursEdit: "x" }).success,
    ).toBe(false);
  });
  it("δέχεται κενή σημείωση (την καθαρίζει)", () => {
    const result = setCostSchema.safeParse({
      itemId: ITEM,
      directCostNote: "",
    });
    expect(result.success && result.data.directCostNote).toBe("");
  });
  it("δέχεται Άμεσο κόστος με κόμμα", () => {
    const result = setCostSchema.safeParse({
      itemId: ITEM,
      directCost: "25,5",
    });
    expect(result.success && result.data.directCost).toBe(25.5);
  });
});

describe("setPublicSchema", () => {
  const base = {
    itemId: ITEM,
    nameEn: "",
    descriptionPublic: "",
    descriptionPublicEn: "",
  };
  it("απορρίπτει δημόσιο χωρίς ελληνική περιγραφή", () => {
    const result = setPublicSchema.safeParse({ ...base, isPublic: "on" });
    expect(!result.success && result.error.issues[0]?.message).toBe(
      "Ένα δημόσιο Πακέτο θέλει σύντομη περιγραφή στα ελληνικά.",
    );
  });
  it("δέχεται δημόσιο με ελληνικά και χωρίς αγγλικά", () => {
    const result = setPublicSchema.safeParse({
      ...base,
      isPublic: "on",
      descriptionPublic: "Μηνιαίο πακέτο social.",
    });
    expect(result.success && result.data.isPublic).toBe(true);
  });
  it("τα checkbox που λείπουν γίνονται false", () => {
    const result = setPublicSchema.safeParse(base);
    expect(result.success && result.data.isPublic).toBe(false);
    expect(result.success && result.data.showsPrice).toBe(false);
  });
});
