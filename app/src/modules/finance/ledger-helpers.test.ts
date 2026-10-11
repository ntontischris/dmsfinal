import { describe, expect, it } from "vitest";

import {
  balanceLabel,
  balanceText,
  clientParam,
  ledgerHref,
  moneyOrDash,
} from "./ledger-helpers";

describe("balanceLabel", () => {
  it("should tell the team who owes when the balance is positive", () => {
    expect(balanceLabel(740, false)).toBe("Υπόλοιπο (χρωστά)");
  });

  it("should say the balance is in favour of the client when negative", () => {
    expect(balanceLabel(-500, false)).toBe("Υπόλοιπο υπέρ του πελάτη");
  });

  it("should address the client directly in the client view", () => {
    expect(balanceLabel(740, true)).toBe("Υπόλοιπο (χρωστάς)");
    expect(balanceLabel(-500, true)).toBe("Υπόλοιπο υπέρ σου");
  });

  it("should treat a zero balance as owed, not in favour", () => {
    expect(balanceLabel(0, true)).toBe("Υπόλοιπο (χρωστάς)");
  });
});

describe("balanceText", () => {
  it("should show the absolute amount", () => {
    expect(balanceText(-500)).toBe(balanceText(500));
  });
});

describe("moneyOrDash", () => {
  it("should show a dash for zero and the amount otherwise", () => {
    expect(moneyOrDash(0)).toBe("—");
    expect(moneyOrDash(124)).toContain("124");
  });
});

describe("ledgerHref and clientParam", () => {
  const ID = "00000000-0000-0000-0000-0000000000c1";

  it("should build the ledger address with and without a client", () => {
    expect(ledgerHref()).toBe("/app/finance/ledger");
    expect(ledgerHref(ID)).toBe(`/app/finance/ledger?client=${ID}`);
  });

  it("should accept only a uuid as the client parameter", () => {
    expect(clientParam(ID)).toBe(ID);
    expect(clientParam("not-a-uuid")).toBeUndefined();
    expect(clientParam(undefined)).toBeUndefined();
  });
});
