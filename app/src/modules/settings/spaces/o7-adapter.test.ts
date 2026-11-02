import { describe, expect, it } from "vitest";

import { fmtOpened, linesOf, pendingOf } from "./o7-adapter";

describe("linesOf", () => {
  it("should map a fill line to its page and who fills it", () => {
    const [line] = linesOf([{ item: "tax_details", done: false, note: null }]);
    expect(line).toMatchObject({
      id: "tax_details",
      what: "ΑΦΜ, ΔΟΥ, ΓΕΜΗ",
      who: "Ιδιοκτήτης",
      done: false,
      href: "/app/settings/company",
      isManual: false,
      comesWith: null,
    });
  });

  it("should mark owner-confirmed lines as manual", () => {
    expect(linesOf([{ item: "legal_texts", done: false, note: "confirm" }])[0].isManual).toBe(true);
  });

  it("should say which module will fill a line that is not built yet", () => {
    expect(linesOf([{ item: "logo", done: false, note: "module:files" }])[0].comesWith).toBe("τα Αρχεία");
  });

  it("should keep an unknown item visible with its code", () => {
    expect(linesOf([{ item: "new_thing", done: true, note: null }])[0]).toMatchObject({
      what: "new_thing",
      who: "—",
      href: null,
    });
  });
});

describe("pendingOf", () => {
  it("should count lines that are not done", () => {
    const lines = linesOf([
      { item: "logo", done: false, note: null },
      { item: "catalogue", done: true, note: null },
      { item: "costs", done: false, note: null },
    ]);
    expect(pendingOf(lines)).toBe(2);
  });
});

describe("fmtOpened", () => {
  it("should show the Athens date", () => {
    expect(fmtOpened("2026-10-09T22:30:00Z")).toBe("10/10/2026");
  });
});
