import { describe, expect, it } from "vitest";

import { crewAppliedState } from "./notices";

describe("crewAppliedState", () => {
  it("should confirm when nobody was skipped", () => {
    expect(crewAppliedState({ skipped: [] }, 2)).toEqual({
      notice: "Το Πρότυπο εφαρμόστηκε στο Συνεργείο.",
    });
  });

  it("should warn that nobody went in when every member was skipped", () => {
    const state = crewAppliedState(
      { skipped: [{ name: "Άννα", reason: "busy" }, { reason: "inactive" }] },
      2,
    );
    expect(state.notice).toBeUndefined();
    expect(state.warning).toBe(
      "Δεν μπήκε κανείς: Άννα έχει άλλο Γύρισμα εκείνη την ώρα· Ένα μέλος δεν είναι ενεργό.",
    );
  });

  it("should warn about a partial template with the reasons", () => {
    const state = crewAppliedState(
      { skipped: [{ name: "Άννα", reason: "busy" }] },
      3,
    );
    expect(state.warning).toContain("εν μέρει");
    expect(state.warning).toContain("Άννα");
  });
});
