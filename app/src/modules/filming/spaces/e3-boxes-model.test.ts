import { expect, test } from "vitest";

import {
  balanceSummary,
  crewSummary,
  equipmentSummary,
  recordSummary,
} from "./e3-boxes-model";
import type { CrewMember, EquipmentLine } from "../types";

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

const lineOf = (overrides: Partial<EquipmentLine> = {}): EquipmentLine => ({
  itemId: "i1",
  name: "Κάμερα",
  status: "available",
  conflict: false,
  ...overrides,
});

test("άδειο Συνεργείο ζητά προσοχή", () => {
  expect(crewSummary([])).toEqual({ text: "Κανείς ακόμα", isAlert: true });
});

test("το Συνεργείο μετρά άτομα και απαντήσεις", () => {
  const crew = [
    memberOf({ response: "confirmed" }),
    memberOf({ userId: "u2", response: "confirmed" }),
    memberOf({ userId: "u3" }),
  ];
  expect(crewSummary(crew)).toEqual({
    text: "3 άτομα · 2 επιβεβαιώνουν · 1 αναμένει",
    isAlert: false,
  });
});

test("ένα άτομο σε ενικό, και το «δεν μπορώ» ζητά προσοχή", () => {
  expect(crewSummary([memberOf({ response: "declined" })])).toEqual({
    text: "1 άτομο · 1 δεν μπορεί",
    isAlert: true,
  });
});

test("ο Εξοπλισμός μετρά κομμάτια και όσα θέλουν προσοχή", () => {
  expect(equipmentSummary([])).toEqual({
    text: "Τίποτα δεσμευμένο",
    isAlert: false,
  });
  expect(equipmentSummary([lineOf()])).toEqual({
    text: "1 κομμάτι",
    isAlert: false,
  });
  expect(
    equipmentSummary([lineOf(), lineOf({ itemId: "i2", conflict: true })]),
  ).toEqual({ text: "2 κομμάτια · 1 θέλει προσοχή", isAlert: true });
  expect(equipmentSummary([lineOf({ status: "repair" })]).isAlert).toBe(true);
});

test("η Παροχή δείχνει τι μένει", () => {
  expect(balanceSummary(null)).toEqual({
    text: "Χωρίς Παροχή",
    isAlert: false,
  });
  expect(
    balanceSummary({
      total: 5,
      used: 2,
      reserved: 1,
      left: 2,
      over: 0,
      kindLabel: "Γύρισμα",
    }),
  ).toEqual({ text: "2 από 5 υπόλοιπα", isAlert: false });
  expect(
    balanceSummary({
      total: 4,
      used: 4,
      reserved: 0,
      left: 0,
      over: 0,
      kindLabel: "Γύρισμα",
    }).isAlert,
  ).toBe(true);
  expect(
    balanceSummary({
      total: 2,
      used: 2,
      reserved: 1,
      left: 0,
      over: 1,
      kindLabel: "Γύρισμα",
    }),
  ).toEqual({ text: "1 πάνω από τα 2", isAlert: true });
});

test("το Δελτίο και το ιστορικό σε μία γραμμή", () => {
  expect(
    recordSummary({ sheetVersion: null, historyCount: 0, noteCount: 0 }),
  ).toBe("Χωρίς Δελτίο · καμία σημείωση");
  expect(
    recordSummary({ sheetVersion: 2, historyCount: 4, noteCount: 1 }),
  ).toBe("Δελτίο έκδοση 2 · 4 κινήσεις · 1 σημείωση");
});
