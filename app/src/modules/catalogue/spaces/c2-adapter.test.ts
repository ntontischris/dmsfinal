import { describe, expect, it } from "vitest";

import type { CatalogueItem, ProvisionKind } from "../types";

import {
  hasFreeKind,
  kindOptions,
  measureText,
  provisionsIntro,
  serializeDrafts,
  toDrafts,
  usesText,
  vatHint,
  visitorLine,
} from "./c2-adapter";

const kind = (patch: Partial<ProvisionKind> = {}): ProvisionKind => ({
  id: "k1",
  code: null,
  label: "Γύρισμα",
  labelEn: "Shoot",
  unit: "Γυρίσματα",
  unitEn: "Shoots",
  measure: "per_filming",
  defaultHours: 4,
  sort: 1,
  isRetired: false,
  ...patch,
});

const item = (patch: Partial<CatalogueItem> = {}): CatalogueItem => ({
  id: "i1",
  kind: "package",
  billing: "monthly",
  name: "Social",
  nameEn: "",
  description: "",
  unit: "",
  isPublic: true,
  showsPrice: true,
  descriptionPublic: "",
  descriptionPublicEn: "",
  isRetired: false,
  price: 1300,
  hoursShoot: 4,
  hoursEdit: 8,
  directCost: 0,
  directCostNote: null,
  provisions: [],
  uses: 0,
  updatedAt: "2026-10-01T10:00:00Z",
  updatedByName: null,
  ...patch,
});

describe("κείμενα ενοτήτων", () => {
  it("should describe provisions per Period for a monthly package", () => {
    expect(provisionsIntro({ kind: "package", billing: "monthly" })).toBe(
      "Τι παίρνει ο πελάτης σε κάθε Περίοδο.",
    );
    expect(provisionsIntro({ kind: "package", billing: "one_off" })).toBe(
      "Τι παίρνει ο πελάτης συνολικά.",
    );
    expect(provisionsIntro({ kind: "service", billing: null })).toMatch(
      /^Τι δίνει μία μονάδα/,
    );
  });

  it("should describe how a kind is counted", () => {
    expect(measureText(kind())).toBe("ανά Γύρισμα, έως 4 ώρες");
    expect(measureText(kind({ defaultHours: null }))).toBe("ανά Γύρισμα");
    expect(measureText(kind({ measure: null }))).toBe("μετράει σε πλήθος");
    expect(measureText(undefined)).toBe("");
  });

  it("should give the VAT hint only when price and rate are known", () => {
    expect(vatHint(100, 24)).toMatch(/^Με ΦΠΑ 24%: 124,00/);
    expect(vatHint(null, 24)).toBeNull();
    expect(vatHint(100, null)).toBeNull();
  });

  it("should say what the visitor sees", () => {
    const shown = { isPublic: true, showsPrice: true };
    expect(visitorLine(item(), { ...shown, isPublic: false })).toBe(
      "Δεν φαίνεται στην Ιστοσελίδα.",
    );
    expect(visitorLine(item(), { ...shown, showsPrice: false })).toBe(
      "Ο Επισκέπτης βλέπει το Πακέτο χωρίς τιμή.",
    );
    expect(visitorLine(item(), shown)).toMatch(/«από 1\.300,00\s€ \+ ΦΠΑ»/);
    expect(visitorLine(item({ price: null }), shown)).toBe(
      "Ο Επισκέπτης βλέπει το Πακέτο με ένδειξη τιμής.",
    );
  });

  it("should count agreements that copied the item", () => {
    expect(usesText(0)).toBe("Καμία Συμφωνία δεν το έχει αντιγράψει ακόμα.");
    expect(usesText(3)).toBe("3 Συμφωνίες το έχουν αντιγράψει.");
  });
});

describe("γραμμές Παροχών", () => {
  it("should serialize only rows with a kind, unreadable quantity as 0", () => {
    const rows = [
      { key: 0, kindId: "k1", quantity: "2" },
      { key: 1, kindId: "", quantity: "1" },
      { key: 2, kindId: "k2", quantity: "x" },
    ];
    expect(JSON.parse(serializeDrafts(rows))).toEqual([
      { kindId: "k1", quantity: 2 },
      { kindId: "k2", quantity: 0 },
    ]);
  });

  it("should round-trip saved provisions into drafts", () => {
    expect(toDrafts([{ kindId: "k1", quantity: 4 }])).toEqual([
      { key: 0, kindId: "k1", quantity: "4" },
    ]);
  });

  it("should offer free active kinds plus the row's own retired kind", () => {
    const kinds = [
      kind(),
      kind({ id: "k2", unit: "Reels" }),
      kind({ id: "k3", unit: "Ώρες", isRetired: true }),
    ];
    const rows = [
      { key: 0, kindId: "k1", quantity: "1" },
      { key: 1, kindId: "k3", quantity: "1" },
    ];
    expect(kindOptions(rows[1]!, rows, kinds)).toEqual([
      { id: "k2", label: "Reels" },
      { id: "k3", label: "Ώρες (αποσυρμένο)" },
    ]);
    expect(hasFreeKind(rows, kinds)).toBe(true);
    expect(
      hasFreeKind([...rows, { key: 2, kindId: "k2", quantity: "1" }], kinds),
    ).toBe(false);
  });
});
