import { describe, expect, it } from "vitest";

import {
  clientFieldsSchema,
  createOpportunitySchema,
  decideAccessSchema,
  mergeSchema,
  nextStepSchema,
} from "./schemas";

const UUID_A = "11111111-1111-4111-8111-111111111111";
const UUID_B = "22222222-2222-4222-8222-222222222222";

const validClient = {
  name: "Κυψέλη Καφέ",
  legalName: "",
  city: "",
  afm: "",
  contactName: "Μαρία",
  contactEmail: "maria@example.gr",
  contactPhone: "",
};

describe("clientFieldsSchema", () => {
  it("δέχεται έγκυρο ΑΦΜ", () => {
    expect(
      clientFieldsSchema.safeParse({ ...validClient, afm: "099999999" })
        .success,
    ).toBe(true);
  });
  it("δέχεται κενό ΑΦΜ", () => {
    expect(clientFieldsSchema.safeParse(validClient).success).toBe(true);
  });
  it("απορρίπτει ΑΦΜ με λάθος ψηφίο ελέγχου", () => {
    expect(
      clientFieldsSchema.safeParse({ ...validClient, afm: "123456789" })
        .success,
    ).toBe(false);
  });
  it("απορρίπτει άκυρο email", () => {
    const result = clientFieldsSchema.safeParse({
      ...validClient,
      contactEmail: "maria",
    });
    expect(result.success).toBe(false);
  });
});

describe("nextStepSchema", () => {
  it("απορρίπτει κενό Επόμενο βήμα", () => {
    expect(
      nextStepSchema.safeParse({ nextStep: "  ", nextStepDue: "2026-10-10" })
        .success,
    ).toBe(false);
  });
  it("απορρίπτει ανύπαρκτη ημερομηνία", () => {
    expect(
      nextStepSchema.safeParse({ nextStep: "Κλήση", nextStepDue: "2026-02-30" })
        .success,
    ).toBe(false);
  });
});

describe("decideAccessSchema", () => {
  it("η απόρριψη χωρίς σχόλιο απορρίπτεται", () => {
    const result = decideAccessSchema.safeParse({
      requestId: UUID_A,
      decision: "reject",
      comment: "",
    });
    expect(result.success).toBe(false);
  });
  it("η έγκριση δεν χρειάζεται σχόλιο", () => {
    const result = decideAccessSchema.safeParse({
      requestId: UUID_A,
      decision: "approve",
      comment: "",
    });
    expect(result.success).toBe(true);
  });
});

describe("mergeSchema", () => {
  it("απορρίπτει ίδιο Πελάτη και στις δύο θέσεις", () => {
    expect(
      mergeSchema.safeParse({ survivorId: UUID_A, absorbedId: UUID_A }).success,
    ).toBe(false);
  });
  it("δέχεται δύο διαφορετικούς Πελάτες", () => {
    expect(
      mergeSchema.safeParse({ survivorId: UUID_A, absorbedId: UUID_B }).success,
    ).toBe(true);
  });
});

describe("createOpportunitySchema", () => {
  it("δέχεται clientId κενό (νέος Πελάτης)", () => {
    const result = createOpportunitySchema.safeParse({
      clientId: "",
      title: "Βίντεο εγκαινίων",
      sourceId: UUID_A,
      referredBy: "",
      nextStep: "Πρώτη κλήση",
      nextStepDue: "2026-10-12",
    });
    expect(result.success).toBe(true);
  });
});
