import { describe, expect, it } from "vitest";

import type { FilmingTeamInfo } from "../types";
import { outcomeNotes } from "./e3-outcome";

const team = (outcome: Partial<FilmingTeamInfo["outcome"]> = {}): FilmingTeamInfo => ({
  details: { contactName: null, contactPhone: null, filesUrl: null, updatedAt: null },
  google: { state: "off", at: null, error: null },
  outcome: { billable: "none", extraBillable: false, noShowBurns: true, ...outcome },
  canEditDetails: true,
});

const makeCard = (over: Partial<Parameters<typeof outcomeNotes>[0]> = {}): Parameters<typeof outcomeNotes>[0] => ({
  agreement: { id: "a1", title: "Μηνιαίο", kind: "monthly", filmingCancelHours: 48 },
  burned: false,
  isExtra: false,
  kind: { id: "k1", label: "Γύρισμα", measure: "per_filming" },
  state: "scheduled",
  team: team(),
  ...over,
});

describe("outcomeNotes", () => {
  it("should say the Provision is used and nothing is billed when a covered filming is done", () => {
    expect(outcomeNotes(makeCard(), "done")[0]).toContain("Η Παροχή «Γύρισμα» μετρά ως ένα Γύρισμα");
  });

  it("should say hours count when the Provision is per hour", () => {
    const card = makeCard({ kind: { id: "k2", label: "Ώρες γυρίσματος", measure: "per_hour" } });
    expect(outcomeNotes(card, "done")[0]).toContain("μετρά με τις πραγματικές ώρες");
  });

  it("should say an extra filming becomes a billable when the Agreement prices it", () => {
    const card = makeCard({ isExtra: true, team: team({ extraBillable: true }) });
    expect(outcomeNotes(card, "done")[0]).toContain("Μπαίνει μόνο του στα Τιμολογητέα");
  });

  it("should say an extra filming without a price is billed by hand", () => {
    expect(outcomeNotes(makeCard({ isExtra: true }), "done")[0]).toContain("με το χέρι");
  });

  it("should say an internal filming uses nothing", () => {
    expect(outcomeNotes(makeCard({ agreement: null }), "done")[0]).toContain("Εσωτερικό Γύρισμα");
  });

  it("should follow the Agreement terms for a no-show", () => {
    expect(outcomeNotes(makeCard(), "noshow")[0]).toContain("καίγεται");
    expect(outcomeNotes(makeCard({ team: team({ noShowBurns: false }) }), "noshow")[0]).toContain("επιστρέφει");
  });

  it("should say the Provision returns on undo of a done filming", () => {
    expect(outcomeNotes(makeCard({ state: "done" }), "undo")).toContain("Η Παροχή «Γύρισμα» επιστρέφει στο υπόλοιπο.");
  });

  it("should not promise a returned Provision when a no-show did not burn it", () => {
    const notes = outcomeNotes(makeCard({ state: "no_show", burned: false }), "undo");
    expect(notes.join(" ")).not.toContain("επιστρέφει στο υπόλοιπο");
  });

  it("should warn that a pending billable stays and an invoiced one needs a credit note", () => {
    const pending = makeCard({ state: "done", isExtra: true, team: team({ billable: "pending" }) });
    expect(outcomeNotes(pending, "undo").join(" ")).toContain("δεν σβήνεται μόνο του");
    const invoiced = makeCard({ state: "done", isExtra: true, team: team({ billable: "invoiced" }) });
    expect(outcomeNotes(invoiced, "undo").join(" ")).toContain("πιστωτικό");
  });
});
