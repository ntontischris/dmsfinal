import { describe, expect, it } from "vitest";

import {
  correctionFormSchema,
  deleteFormSchema,
  methodFormSchema,
  previewSchema,
  receiptFormSchema,
} from "./schemas";

const CLIENT = "6f1c2f1e-3b0a-4d6e-9d52-0a1b2c3d4e5f";
const METHOD = "0b8c7d6e-5f4a-4b3c-8d2e-1f0a9b8c7d6e";
const RECEIPT = "1c2d3e4f-5a6b-4c7d-8e9f-0a1b2c3d4e5f";

const validForm = {
  clientId: CLIENT,
  amount: "150,50",
  receivedOn: "2026-10-05",
  methodId: METHOD,
  note: "  Προκαταβολή  ",
};

describe("receiptFormSchema", () => {
  it("δέχεται ποσό με κόμμα και καθαρίζει τη σημείωση", () => {
    const parsed = receiptFormSchema.parse(validForm);
    expect(parsed.amount).toBe(150.5);
    expect(parsed.note).toBe("Προκαταβολή");
  });

  it("απορρίπτει μηδενικό ή άκυρο ποσό", () => {
    expect(receiptFormSchema.safeParse({ ...validForm, amount: "0" }).success).toBe(false);
    expect(receiptFormSchema.safeParse({ ...validForm, amount: "10,123" }).success).toBe(false);
    expect(receiptFormSchema.safeParse({ ...validForm, amount: "" }).success).toBe(false);
  });

  it("απορρίπτει ημερομηνία που δεν είναι YYYY-MM-DD", () => {
    expect(receiptFormSchema.safeParse({ ...validForm, receivedOn: "5/10/2026" }).success).toBe(false);
  });
});

describe("correctionFormSchema και deleteFormSchema", () => {
  it("θέλουν λόγο που δεν είναι κενός", () => {
    expect(deleteFormSchema.safeParse({ id: RECEIPT, reason: "   " }).success).toBe(false);
    expect(deleteFormSchema.safeParse({ id: RECEIPT, reason: "Διπλή καταχώρηση" }).success).toBe(true);
    expect(
      correctionFormSchema.safeParse({ ...validForm, id: RECEIPT, reason: "" }).success,
    ).toBe(false);
  });
});

describe("previewSchema", () => {
  it("θέλει Πελάτη και θετικό ποσό", () => {
    expect(previewSchema.safeParse({ clientId: CLIENT, amount: "120" }).success).toBe(true);
    expect(previewSchema.safeParse({ clientId: "όχι-uuid", amount: "120" }).success).toBe(false);
  });
});

describe("methodFormSchema", () => {
  it("κενό id σημαίνει νέος Τρόπος", () => {
    const parsed = methodFormSchema.parse({ id: "", label: " Επιταγή " });
    expect(parsed).toEqual({ id: null, label: "Επιταγή" });
  });

  it("απορρίπτει κενή ή πολύ μεγάλη ονομασία", () => {
    expect(methodFormSchema.safeParse({ id: "", label: "   " }).success).toBe(false);
    expect(methodFormSchema.safeParse({ id: "", label: "α".repeat(61) }).success).toBe(false);
  });
});
