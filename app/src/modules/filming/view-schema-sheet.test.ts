import { describe, expect, it } from "vitest";

import { sheetSummarySchema, sheetViewSchema } from "./view-schema-sheet";

const sheetJson = {
  shots: [{ id: "c1", text: "Είσοδος" }],
  crewNote: null,
  current: { version: 1, issuedAt: "2026-10-09T07:00:00+00:00", issuedBy: "Γιώργος", change: null },
  versions: [{ version: 1, issuedAt: "2026-10-09T07:00:00+00:00", issuedByName: "Γιώργος", change: null }],
  hasChanges: false,
  canEdit: true,
  canIssue: true,
  latest: null,
};

describe("το JSON του Δελτίου", () => {
  it("περνά όταν έχει όλα τα πεδία", () => {
    expect(sheetViewSchema.parse(sheetJson).current?.version).toBe(1);
  });

  it("σπάει όταν λείπει το Δικαίωμα επεξεργασίας", () => {
    const withoutCanEdit = { ...sheetJson, canEdit: undefined };
    expect(sheetViewSchema.safeParse(withoutCanEdit).success).toBe(false);
  });
});

describe("η σύνοψη του Δελτίου στην κάρτα", () => {
  it("δέχεται απουσία (null) για πελάτη ή μη μέλος", () => {
    expect(sheetSummarySchema.parse(null)).toBeNull();
  });

  it("δέχεται έκδοση με αλλαγές", () => {
    expect(sheetSummarySchema.parse({ version: 2, hasChanges: true })).toEqual({ version: 2, hasChanges: true });
  });
});
