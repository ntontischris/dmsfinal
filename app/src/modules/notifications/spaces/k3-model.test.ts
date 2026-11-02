import { describe, expect, it } from "vitest";

import { isAttention, timeParts, whatNextOf } from "./k3-model";

describe("K3 οδηγίες", () => {
  it("όριο αποστολών: λέει τι θα γίνει και τι μπορείς να κάνεις", () => {
    expect(
      whatNextOf({ state: "failed", reason: "Πέρασε το ημερήσιο όριο email" }),
    ).toBe(
      "Θα ξαναδοκιμάσει μόνο του αύριο το πρωί. Αν βιάζεσαι, πάτησε «Ξαναστείλε».",
    );
  });

  it("ο παραλήπτης το έχει σβήσει: δεν υπάρχει κάτι να κάνεις εδώ", () => {
    expect(
      whatNextOf({
        state: "not_sent",
        reason: "Ο παραλήπτης το έχει σβήσει για τον εαυτό του",
      }),
    ).toBe("Δεν χρειάζεται κάτι από σένα· είναι επιλογή του παραλήπτη.");
  });

  it("αποτυχία και νέα προσπάθεια: λέει τι γίνεται", () => {
    expect(whatNextOf({ state: "failed", reason: null })).toBe(
      "Πάτησε «Ξαναστείλε». Αν αποτύχει ξανά, έλεγξε το email του παραλήπτη.",
    );
    expect(whatNextOf({ state: "retrying", reason: null })).toBe(
      "Ξαναδοκιμάζει μόνο του· δεν χρειάζεται κάτι από σένα.",
    );
  });

  it("σταλμένα και προγραμματισμένα: καμία οδηγία", () => {
    expect(whatNextOf({ state: "sent", reason: null })).toBeNull();
    expect(whatNextOf({ state: "scheduled", reason: null })).toBeNull();
  });

  it("η ώρα και η μέρα της γραμμής είναι σε ώρα Ελλάδας", () => {
    expect(timeParts("2026-01-31T22:30:00Z")).toEqual({
      time: "00:30",
      date: "01/02/2026",
    });
    expect(timeParts("x")).toEqual({ time: "—", date: "" });
  });

  it("σήμα προσοχής μόνο σε αποτυχία ή νέα προσπάθεια", () => {
    expect(isAttention({ state: "failed" })).toBe(true);
    expect(isAttention({ state: "sent" })).toBe(false);
  });
});
