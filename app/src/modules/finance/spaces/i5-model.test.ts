import { describe, expect, it } from "vitest";

import type { I5Row } from "./i5-adapter";
import { balanceLabelOf, ledgerTotalsOf, lineMarkOf } from "./i5-model";

const row = (overrides: Partial<I5Row> = {}): I5Row => ({
  key: "k",
  date: "2026-09-01",
  label: "Τιμολόγιο Α-58",
  debit: 0,
  credit: 0,
  balance: 0,
  ...overrides,
});

describe("ledgerTotalsOf", () => {
  it("should sum debits and credits of every movement", () => {
    const totals = ledgerTotalsOf([
      row({ debit: 716 }),
      row({ credit: 600 }),
      row({ credit: 116 }),
    ]);
    expect(totals).toEqual({ debit: 716, credit: 716 });
  });

  it("should return zeros when there are no movements", () => {
    expect(ledgerTotalsOf([])).toEqual({ debit: 0, credit: 0 });
  });
});

describe("lineMarkOf", () => {
  it("should use the first letter of the movement label", () => {
    expect(lineMarkOf("είσπραξη 12/09")).toBe("Ε");
  });

  it("should fall back to a dot for an empty label", () => {
    expect(lineMarkOf("  ")).toBe("·");
  });
});

describe("balanceLabelOf", () => {
  it("should say the client is in credit when the balance is negative", () => {
    expect(balanceLabelOf(-400, false)).toBe(
      "Υπόλοιπο υπέρ του πελάτη (με ΦΠΑ)",
    );
    expect(balanceLabelOf(-400, true)).toBe("Υπόλοιπο υπέρ σου (με ΦΠΑ)");
  });

  it("should say what is owed when the balance is positive", () => {
    expect(balanceLabelOf(116, false)).toBe("Χρωστά από Τιμολόγια (με ΦΠΑ)");
    expect(balanceLabelOf(116, true)).toBe("Χρωστάς από Τιμολόγια (με ΦΠΑ)");
  });
});
