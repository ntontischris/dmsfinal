import { expect, test } from "vitest";

import {
  balanceOf,
  doneMessage,
  emptyCrewNote,
  fmtDay,
  hoursLabel,
  isOpenState,
  notesOf,
  replyOf,
} from "./e3-model";
import type { CrewMember } from "../types";

test("η μέρα γράφεται με όνομα και ημερομηνία", () => {
  expect(fmtDay("2026-09-21")).toBe("Δευτέρα 21/09");
});

test("ώρες με κόμμα και σωστό ενικό", () => {
  expect(hoursLabel(1)).toBe("1 ώρα");
  expect(hoursLabel(2.5)).toBe("2,5 ώρες");
});

test("ανοιχτά είναι μόνο τα αναμένει έγκριση και προγραμματισμένο", () => {
  expect(isOpenState("pending")).toBe(true);
  expect(isOpenState("scheduled")).toBe(true);
  expect(isOpenState("done")).toBe(false);
});

test("το κενό Συνεργείο εξηγεί τι περιμένει", () => {
  expect(emptyCrewNote("pending", true)).toContain("Πρώτα έγκρινέ το");
  expect(emptyCrewNote("scheduled", false)).toContain("Πρόσθεσε άτομο");
});

test("η Παροχή μετρά και τα μεταφερμένα στο σύνολο", () => {
  expect(
    balanceOf({
      given: 4,
      carried: 1,
      used: 2,
      reserved: 1,
      balance: 2,
      kind: { id: "k", label: "Γύρισμα", measure: "per_filming" },
    }),
  ).toEqual({ total: 5, used: 2, reserved: 1, left: 2, kindLabel: "Γύρισμα" });
});

const memberOf = (overrides: Partial<CrewMember> = {}): CrewMember => ({
  userId: "u1",
  name: "Νίκος",
  response: "pending",
  reason: null,
  respondedAt: null,
  version: null,
  isBlocked: false,
  ...overrides,
});

test("απάντηση μόνο για μέλος, σε ανοιχτό Γύρισμα, με εκδομένο Δελτίο", () => {
  expect(replyOf(undefined, "scheduled", 2)).toBeNull();
  expect(replyOf(memberOf(), "done", 2)).toBeNull();
  expect(replyOf(memberOf(), "scheduled", null)).toBeNull();
  expect(replyOf(memberOf(), "pending", 1)).toEqual({
    version: 1,
    isAnswered: false,
    canConfirm: true,
    canDecline: true,
  });
});

test("ό,τι ήδη ισχύει για την τρέχουσα έκδοση δεν ξαναστέλνεται", () => {
  const confirmed = memberOf({ response: "confirmed", version: 2 });
  expect(replyOf(confirmed, "scheduled", 2)).toMatchObject({
    isAnswered: true,
    canConfirm: false,
    canDecline: true,
  });
  // Νέα έκδοση: ξαναζητείται απάντηση.
  expect(replyOf(confirmed, "scheduled", 3)).toMatchObject({
    isAnswered: false,
    canConfirm: true,
    canDecline: true,
  });
});

test("οι Σημειώσεις δείχνουν μόνο όσες υπάρχουν, με τη σειρά της σημερινής σελίδας", () => {
  expect(
    notesOf({
      clientNote: "Φέρτε φώτα",
      internalNote: null,
      rejectedReason: "",
      cancelledReason: "Βροχή",
    }),
  ).toEqual([
    { label: "Σημείωση Πελάτη", text: "Φέρτε φώτα" },
    { label: "Λόγος ακύρωσης", text: "Βροχή" },
  ]);
  expect(
    notesOf({
      clientNote: null,
      internalNote: null,
      rejectedReason: null,
      cancelledReason: null,
    }),
  ).toEqual([]);
});

test("το μήνυμα μετά από κράτηση ή μετάθεση λέει αν μπήκε σε έγκριση", () => {
  expect(doneMessage("booked", { state: "pending", hasPendingReschedule: false })).toBe(
    "Η κράτηση στάλθηκε για έγκριση.",
  );
  expect(doneMessage("booked", { state: "scheduled", hasPendingReschedule: false })).toBe(
    "Η κράτηση επιβεβαιώθηκε.",
  );
  expect(doneMessage("rescheduled", { state: "scheduled", hasPendingReschedule: true })).toBe(
    "Η μετάθεση στάλθηκε για έγκριση.",
  );
  expect(doneMessage("rescheduled", { state: "scheduled", hasPendingReschedule: false })).toBe(
    "Η μετάθεση έγινε.",
  );
});
