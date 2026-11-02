import { describe, expect, it } from "vitest";

import { o2StatusOf, toggleRetiredHref, usesText } from "./o2-adapter";

describe("o2StatusOf", () => {
  it("should call a retired value «Αποσύρθηκε» even if it was used", () => {
    expect(o2StatusOf({ isRetired: true }, 4)).toBe("Αποσύρθηκε");
  });
  it("should call a used value «Σε χρήση» and an unused one «Νέα»", () => {
    expect(o2StatusOf({ isRetired: false }, 2)).toBe("Σε χρήση");
    expect(o2StatusOf({ isRetired: false }, 0)).toBe("Νέα");
  });
});

describe("usesText", () => {
  it("should say nothing for a new value and count uses otherwise", () => {
    expect(usesText("Νέα", 0)).toBe("");
    expect(usesText("Σε χρήση", 1)).toBe("1 χρήση");
    expect(usesText("Αποσύρθηκε", 7)).toBe("7 χρήσεις");
  });
});

describe("toggleRetiredHref", () => {
  it("should flip the retired flag in the address", () => {
    expect(toggleRetiredHref(false)).toBe("/app/settings/sales?retired=1");
    expect(toggleRetiredHref(true)).toBe("/app/settings/sales");
  });
});
