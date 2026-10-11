import { describe, expect, it } from "vitest";

import { sheetIssueSchema, sheetSaveSchema } from "./schemas-sheet";

const FILMING_ID = "00000000-0000-4000-8000-0000000000a1";
const SHOT_ID = "00000000-0000-4000-8000-0000000000c1";

const saveInput = (shots: unknown, crewNote = "") => ({
  filmingId: FILMING_ID,
  shots: JSON.stringify(shots),
  crewNote,
});

describe("η φόρμα αποθήκευσης του Δελτίου", () => {
  it("δέχεται λήψεις και κόβει το κείμενο", () => {
    const parsed = sheetSaveSchema.parse(saveInput([{ id: SHOT_ID, text: "  Είσοδος " }]));
    expect(parsed.shots).toEqual([{ id: SHOT_ID, text: "Είσοδος" }]);
  });

  it("απορρίπτει λίστα που δεν είναι JSON", () => {
    const result = sheetSaveSchema.safeParse({ filmingId: FILMING_ID, shots: "{σπασμένο", crewNote: "" });
    expect(result.success).toBe(false);
  });

  it("απορρίπτει κενή λήψη", () => {
    const result = sheetSaveSchema.safeParse(saveInput([{ id: SHOT_ID, text: "   " }]));
    expect(result.success).toBe(false);
  });

  it("απορρίπτει λήψη πάνω από 300 χαρακτήρες", () => {
    const result = sheetSaveSchema.safeParse(saveInput([{ id: SHOT_ID, text: "α".repeat(301) }]));
    expect(result.success).toBe(false);
  });

  it("απορρίπτει πάνω από 100 λήψεις", () => {
    const shots = Array.from({ length: 101 }, (_, index) => ({ id: `s${index}`, text: "λήψη" }));
    expect(sheetSaveSchema.safeParse(saveInput(shots)).success).toBe(false);
  });

  it("κρατά κενή σημείωση ως null", () => {
    expect(sheetSaveSchema.parse(saveInput([], "   ")).crewNote).toBeNull();
  });
});

describe("η φόρμα έκδοσης του Δελτίου", () => {
  it("δέχεται έκδοση χωρίς περιγραφή", () => {
    expect(sheetIssueSchema.parse({ filmingId: FILMING_ID, change: "" }).change).toBeNull();
  });

  it("απορρίπτει περιγραφή πάνω από 300 χαρακτήρες", () => {
    expect(sheetIssueSchema.safeParse({ filmingId: FILMING_ID, change: "α".repeat(301) }).success).toBe(false);
  });
});
