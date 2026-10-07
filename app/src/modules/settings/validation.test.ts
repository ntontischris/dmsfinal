import { describe, expect, it } from "vitest";

import { formatIban, isValidAfm, isValidIban, normalizeIban } from "./validation";

describe("ΑΦΜ", () => {
  it("δέχεται ΑΦΜ με σωστό ψηφίο ελέγχου", () => {
    expect(isValidAfm("090000045")).toBe(true);
    expect(isValidAfm("099999999")).toBe(true);
  });

  it("απορρίπτει λάθος ψηφίο ελέγχου, λάθος μήκος και μηδενικά", () => {
    expect(isValidAfm("090000046")).toBe(false);
    expect(isValidAfm("12345")).toBe(false);
    expect(isValidAfm("000000000")).toBe(false);
  });
});

describe("IBAN", () => {
  it("δέχεται έγκυρο ελληνικό IBAN, και με κενά", () => {
    expect(isValidIban("GR1601101250000000012300695")).toBe(true);
    expect(isValidIban("gr16 0110 1250 0000 0001 2300 695")).toBe(true);
  });

  it("απορρίπτει ένα λάθος ψηφίο", () => {
    expect(isValidIban("GR1601101250000000012300696")).toBe(false);
  });

  it("απορρίπτει ελληνικό IBAN με λάθος μήκος", () => {
    expect(isValidIban("GR160110125000000001230069")).toBe(false);
  });

  it("γράφεται σε τετράδες", () => {
    expect(formatIban(normalizeIban("gr1601101250000000012300695"))).toBe("GR16 0110 1250 0000 0001 2300 695");
  });
});
