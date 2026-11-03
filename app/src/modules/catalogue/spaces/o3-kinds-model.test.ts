import { describe, expect, it } from "vitest";

import type { ProvisionKind } from "../types";
import { hoursText, kindStatusOf, kindSubOf } from "./o3-kinds-model";

const kind = (overrides: Partial<ProvisionKind> = {}): ProvisionKind => ({
  id: "k-1",
  code: null,
  label: "Γύρισμα",
  labelEn: "Filming",
  unit: "μέρα",
  unitEn: "day",
  measure: "per_filming",
  defaultHours: 4,
  sort: 1,
  isRetired: false,
  ...overrides,
});

describe("kindStatusOf", () => {
  it("should call an unused kind new", () => {
    expect(kindStatusOf(kind(), 0)).toBe("Νέο");
  });

  it("should call a used kind in use", () => {
    expect(kindStatusOf(kind(), 3)).toBe("Σε χρήση");
  });

  it("should call a retired kind retired even when used", () => {
    expect(kindStatusOf(kind({ isRetired: true }), 3)).toBe("Αποσύρθηκε");
  });
});

describe("kindSubOf", () => {
  it("should list english label, unit, measure and duration", () => {
    expect(kindSubOf(kind())).toBe(
      "Filming · Μονάδα: μέρα (day) · Τρόπος μέτρησης: ανά Γύρισμα · Προεπιλεγμένη διάρκεια: 4 ώρες",
    );
  });

  it("should show a dash without duration and count without measure", () => {
    expect(kindSubOf(kind({ measure: null, defaultHours: null, labelEn: "" }))).toBe(
      "Μονάδα: μέρα (day) · Τρόπος μέτρησης: σε πλήθος · Προεπιλεγμένη διάρκεια: —",
    );
  });
});

describe("hoursText", () => {
  it("should write decimals with a comma", () => {
    expect(hoursText(kind({ defaultHours: 1.5 }))).toBe("1,5");
  });

  it("should be empty without a kind", () => {
    expect(hoursText()).toBe("");
  });
});
