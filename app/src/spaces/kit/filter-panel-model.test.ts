import { describe, expect, test } from "vitest";

import {
  currentOf,
  isSet,
  matchesQuery,
  type FilterGroup,
  type FilterOption,
} from "./filter-panel-model";

const option = (label: string, isCurrent = false): FilterOption => ({
  label,
  href: `/x?v=${label}`,
  isCurrent,
});

const group = (overrides: Partial<FilterGroup> = {}): FilterGroup => ({
  label: "Πελάτης",
  options: [option("Αρτοποιείο"), option("Ταβέρνα")],
  all: option("όλοι", true),
  ...overrides,
});

describe("currentOf", () => {
  test("δείχνει την τρέχουσα επιλογή", () => {
    const g = group({
      all: option("όλοι"),
      options: [option("Αρτοποιείο"), option("Ταβέρνα", true)],
    });
    expect(currentOf(g)?.label).toBe("Ταβέρνα");
  });

  test("χωρίς τρέχουσα, πέφτει στο «όλοι»", () => {
    expect(currentOf(group({ all: option("όλοι") }))?.label).toBe("όλοι");
  });

  test("ομάδα χωρίς «όλοι» και χωρίς τρέχουσα δεν δείχνει τίποτα", () => {
    expect(currentOf(group({ all: undefined }))).toBeUndefined();
  });
});

describe("isSet", () => {
  test("φίλτρο στο «όλοι» δεν είναι ενεργό", () => {
    expect(isSet(group())).toBe(false);
  });

  test("φίλτρο σε συγκεκριμένη επιλογή είναι ενεργό", () => {
    expect(isSet(group({ all: option("όλοι") }))).toBe(true);
  });

  test("η Κατάσταση (χωρίς «όλοι») δεν μετρά ποτέ ως φίλτρο", () => {
    expect(isSet(group({ all: undefined }))).toBe(false);
  });
});

describe("matchesQuery", () => {
  test("βρίσκει χωρίς τόνους και κεφαλαία", () => {
    expect(matchesQuery("Ταβέρνα Το Λιμανάκι", "λιμανακι")).toBe(true);
    expect(matchesQuery("Ταβέρνα Το Λιμανάκι", "ΤΑΒΕΡ")).toBe(true);
  });

  test("το τελικό ς βρίσκεται και ως σ", () => {
    expect(matchesQuery("Γυμναστήριο Κίνησης", "κινησησ")).toBe(true);
    expect(matchesQuery("Γυμναστήριο Κίνησης", "κινησ")).toBe(true);
    expect(matchesQuery("Καφές", "καφεσ")).toBe(true);
  });

  test("κενή αναζήτηση ταιριάζει με όλα", () => {
    expect(matchesQuery("Οτιδήποτε", "  ")).toBe(true);
  });

  test("δεν ταιριάζει ό,τι δεν περιέχεται", () => {
    expect(matchesQuery("Αρτοποιείο", "ταβ")).toBe(false);
  });
});
