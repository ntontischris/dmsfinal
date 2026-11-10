import { describe, expect, it } from "vitest";

import type { BlockedTimeValues } from "../blocked-form";
import {
  conflictFieldsOf,
  draftOf,
  formFieldsOf,
  isFullDay,
  pickedKindOf,
  validateDraft,
  type Draft,
} from "./a6-model";

const values = (overrides: Partial<BlockedTimeValues> = {}): BlockedTimeValues => ({
  day: "2026-11-03",
  untilDay: null,
  allDay: false,
  from: "09:00",
  to: "10:00",
  title: "Άδεια",
  userId: "u-1",
  ...overrides,
});

const draft = (change: Partial<Draft> = {}): Draft => ({ ...draftOf(values()), ...change });

describe("validateDraft (από το prototype)", () => {
  // Το πεδίο ημερομηνίας δίνει "" όσο η πληκτρολόγηση είναι μισή, ή χρονιά όπως 0002.
  it.each(["0002-09-29", "2026-13-45", "abc"])("should reject the half date «%s»", (date) => {
    expect(isFullDay(date)).toBe(false);
    expect(validateDraft(draft({ date }))).toBe(
      "Η μέρα δεν είναι σωστή. Γράψ' τη ολόκληρη, π.χ. 29/09/2026.",
    );
  });

  it("should ask for a day when it is empty", () => {
    expect(validateDraft(draft({ date: "" }))).toBe("Διάλεξε μέρα.");
  });

  it("should reject a broken until-day", () => {
    expect(validateDraft(draft({ allDay: true, untilDate: "0002-09-30" }))).toBe(
      "Η «Έως μέρα» δεν είναι σωστή. Γράψ' τη ολόκληρη, π.χ. 30/09/2026.",
    );
  });

  it("should reject an until-day before the first day", () => {
    expect(validateDraft(draft({ allDay: true, untilDate: "2026-11-01" }))).toBe(
      "Η «Έως μέρα» πρέπει να είναι ίδια ή μετά την αρχική.",
    );
  });

  it("should reject an end time not after the start time", () => {
    expect(validateDraft(draft({ from: "10:00", to: "10:00" }))).toBe(
      "Η ώρα «Έως» πρέπει να είναι μετά την ώρα «Από».",
    );
  });

  it("should pass a correct date, also without a title (the server allows it)", () => {
    expect(validateDraft(draft({ date: "2026-09-29", label: "" }))).toBeNull();
  });
});

describe("draftOf and formFieldsOf", () => {
  it("should open an all-day block with default hours for switching to hours", () => {
    expect(draftOf(values({ allDay: true, untilDay: "2026-11-05" }))).toMatchObject({
      allDay: true,
      untilDate: "2026-11-05",
      from: "09:00",
      to: "10:00",
    });
  });

  it("should send the old form's field names, without hours for a whole day", () => {
    expect(formFieldsOf(draft({ allDay: true, untilDate: "2026-11-05" }), true)).toEqual({
      userId: "u-1",
      day: "2026-11-03",
      untilDay: "2026-11-05",
      allDay: "on",
      from: "",
      to: "",
      title: "Άδεια",
    });
  });

  it("should leave the person to the database when it cannot be picked", () => {
    const fields = formFieldsOf(draft({ untilDate: "2026-11-05" }), false);
    expect(fields.userId).toBe("");
    expect(fields.untilDay).toBe("");
    expect(fields.allDay).toBe("");
  });
});

describe("conflictFieldsOf (προειδοποίηση Συνεργείου)", () => {
  it("should always send the person and never the title", () => {
    expect(conflictFieldsOf(draft())).toEqual({
      userId: "u-1",
      day: "2026-11-03",
      untilDay: "",
      allDay: "",
      from: "09:00",
      to: "10:00",
      title: "",
    });
  });

  it("should not ask the database while the form has a mistake", () => {
    expect(conflictFieldsOf(draft({ date: "0002-11-03" }))).toBeNull();
    expect(conflictFieldsOf(draft({ from: "11:00", to: "10:00" }))).toBeNull();
  });
});

describe("pickedKindOf", () => {
  const kinds = [
    { id: "k1", label: "Ρεπό", retired: false, color: "teal", icon: "🌙", becomesFilming: false },
    { id: "k2", label: "Παλιό", retired: true, color: "grey", icon: null, becomesFilming: false },
  ];

  it("should preselect the active kind of the quick-add link", () => {
    expect(pickedKindOf("k1", kinds)).toBe("k1");
    expect(pickedKindOf(["k1", "k2"], kinds)).toBe("k1");
  });

  it("should leave the kind empty for a retired, unknown or missing kind", () => {
    expect(pickedKindOf("k2", kinds)).toBe("");
    expect(pickedKindOf("nope", kinds)).toBe("");
    expect(pickedKindOf(undefined, kinds)).toBe("");
  });
});
