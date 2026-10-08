import { describe, expect, it } from "vitest";

import {
  changesSchema,
  closeLostSchema,
  declineSchema,
  decideSchema,
  extendSchema,
  outboxMarkSchema,
  publicTokenSchema,
  requestCodeSchema,
  signOutsideSchema,
  signSchema,
} from "./schemas";

const ID = "11111111-1111-4111-8111-111111111111";
const OTHER = "22222222-2222-4222-8222-222222222222";
const TOKEN = "a".repeat(64);

const messageOf = (result: {
  success: boolean;
  error?: { issues: { message: string }[] };
}): string | undefined => result.error?.issues[0]?.message;

describe("ροή πρότασης", () => {
  it("decideSchema: σχόλιο μόνο στην απόρριψη", () => {
    const ref = { agreementId: ID };
    expect(
      decideSchema.safeParse({ ...ref, decision: "approve", comment: "" })
        .success,
    ).toBe(true);
    const rejected = decideSchema.safeParse({
      ...ref,
      decision: "reject",
      comment: "  ",
    });
    expect(messageOf(rejected)).toBe(
      "Γράψε σχόλιο: τι να αλλάξει ο Υπεύθυνος.",
    );
    expect(
      decideSchema.safeParse({ ...ref, decision: "reject", comment: "Ακριβά" })
        .success,
    ).toBe(true);
  });
  it("extendSchema: κενό = προεπιλογή (null), αλλιώς 1–365", () => {
    expect(extendSchema.parse({ agreementId: ID, days: "" }).days).toBeNull();
    expect(extendSchema.parse({ agreementId: ID, days: "14" }).days).toBe(14);
    expect(
      extendSchema.safeParse({ agreementId: ID, days: "366" }).success,
    ).toBe(false);
  });
  it("closeLostSchema: ο Λόγος απώλειας είναι υποχρεωτικός", () => {
    expect(
      messageOf(
        closeLostSchema.safeParse({ agreementId: ID, lossReasonId: "" }),
      ),
    ).toBe("Διάλεξε Λόγο απώλειας.");
  });
  it("outboxMarkSchema: μόνο manual ή cancelled", () => {
    expect(
      outboxMarkSchema.safeParse({ outboxId: ID, status: "sent" }).success,
    ).toBe(false);
    expect(
      outboxMarkSchema.safeParse({ outboxId: ID, status: "manual" }).success,
    ).toBe(true);
  });
});

describe("signOutsideSchema", () => {
  const base = {
    agreementId: ID,
    signedOn: "2026-10-01",
    signedBy: "Μαρία Συμφωνίου",
    start: "2026-09-01",
    reference: "symfonia.pdf",
    used: "",
    invoiced: "on",
  };
  it("δέχεται πλήρη στοιχεία και διαβάζει τα καταναλωμένα", () => {
    const parsed = signOutsideSchema.parse({
      ...base,
      used: JSON.stringify([{ kindId: OTHER, used: 3 }]),
    });
    expect(parsed.used).toEqual([{ kindId: OTHER, used: 3 }]);
    expect(parsed.invoiced).toBe(true);
  });
  it("κενό πεδίο καταναλωμένων = καμία", () => {
    expect(signOutsideSchema.parse(base).used).toEqual([]);
  });
  it("απορρίπτει αρχείο υπογραφής 2 χαρακτήρων", () => {
    const result = signOutsideSchema.safeParse({ ...base, reference: "ab" });
    expect(messageOf(result)).toBe(
      "Γράψε το αρχείο της υπογραφής (όνομα ή σύνδεσμος).",
    );
  });
  it("απορρίπτει αρνητικά καταναλωμένα", () => {
    expect(
      signOutsideSchema.safeParse({
        ...base,
        used: JSON.stringify([{ kindId: OTHER, used: -1 }]),
      }).success,
    ).toBe(false);
  });
});

describe("δημόσιες φόρμες", () => {
  it("publicTokenSchema: 64 μικρά δεκαεξαδικά", () => {
    expect(publicTokenSchema.safeParse(TOKEN).success).toBe(true);
    expect(publicTokenSchema.safeParse("A".repeat(64)).success).toBe(false);
    expect(publicTokenSchema.safeParse("a".repeat(63)).success).toBe(false);
  });
  it("requestCodeSchema: χρειάζεται το «Αποδέχομαι»", () => {
    expect(
      requestCodeSchema.safeParse({
        token: TOKEN,
        name: "Μαρία",
        accepted: true,
      }).success,
    ).toBe(true);
    expect(
      requestCodeSchema.safeParse({
        token: TOKEN,
        name: "Μαρία",
        accepted: false,
      }).success,
    ).toBe(false);
  });
  it("requestCodeSchema: όνομα 1–120 χαρακτήρες", () => {
    const attempt = (name: string) =>
      requestCodeSchema.safeParse({ token: TOKEN, name, accepted: true })
        .success;
    expect(attempt("")).toBe(false);
    expect(attempt("α".repeat(120))).toBe(true);
    expect(attempt("α".repeat(121))).toBe(false);
  });
  it("signSchema: ακριβώς 6 ψηφία", () => {
    const attempt = (code: string) =>
      signSchema.safeParse({ token: TOKEN, code }).success;
    expect(attempt("481920")).toBe(true);
    expect(attempt("48192")).toBe(false);
    expect(attempt("48192a")).toBe(false);
    expect(attempt("4819201")).toBe(false);
  });
  it("changesSchema και declineSchema: όρια μηνύματος", () => {
    expect(changesSchema.safeParse({ token: TOKEN, message: "" }).success).toBe(
      false,
    );
    expect(
      changesSchema.safeParse({ token: TOKEN, message: "x".repeat(2001) })
        .success,
    ).toBe(false);
    expect(declineSchema.safeParse({ token: TOKEN, reason: "" }).success).toBe(
      true,
    );
    expect(
      declineSchema.safeParse({ token: TOKEN, reason: "x".repeat(1001) })
        .success,
    ).toBe(false);
  });
});
