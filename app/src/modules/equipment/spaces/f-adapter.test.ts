import { describe, expect, it } from "vitest";

import type { FilmingRow } from "@/modules/filming";

import type { EquipmentReservation, HistoryLine } from "../types";
import {
  candidateViewsOf,
  conflictPairsOf,
  filmingLabel,
  historyRowsOf,
  reservationViewsOf,
} from "./f-adapter";

const NOW = new Date("2026-11-02T10:00:00Z");

const reservation = (overrides: Partial<EquipmentReservation> = {}): EquipmentReservation => ({
  filmingId: "f-1",
  startsAt: "2026-11-06T07:00:00Z", // Παρασκευή 09:00 Αθήνας
  hours: 4,
  state: "scheduled",
  conflict: false,
  ...overrides,
});

const filming = (overrides: Partial<FilmingRow> = {}): FilmingRow => ({
  id: "f-1",
  startsAt: "2026-11-06T07:00:00Z",
  hours: 4,
  state: "scheduled",
  client: { id: "c-1", name: "Κυψέλη Καφέ" },
  production: { id: "p-1", title: "Social Νοεμβρίου" },
  crew: null,
  signals: {
    equipmentConflict: false,
    isExtra: false,
    cancelRequest: false,
    crewDeclined: false,
    slotProblem: null,
    pendingReschedule: null,
  },
  ...overrides,
});

describe("filmingLabel", () => {
  it("γράφει Πελάτη, ημέρα και ώρες σε Ώρα Ελλάδας", () => {
    expect(filmingLabel("2026-11-06T07:00:00Z", 4, "Κυψέλη Καφέ")).toBe(
      "Κυψέλη Καφέ · Παρασκευή 06/11 09:00–13:00",
    );
  });

  it("χωρίς όνομα όταν ο Χρήστης δεν βλέπει το Γύρισμα", () => {
    expect(filmingLabel("2026-11-06T07:00:00Z", 2.5, null)).toBe("Παρασκευή 06/11 09:00–11:30");
  });
});

describe("reservationViewsOf", () => {
  it("παίρνει το όνομα από τα ανοιχτά Γυρίσματα και δίνει σύνδεσμο μόνο όπου υπάρχει Γύρισμα", () => {
    const [seen, hidden] = reservationViewsOf(
      [reservation(), reservation({ filmingId: null, startsAt: "2026-10-30T07:00:00Z", state: "pending" })],
      [filming()],
      NOW,
    );
    expect(seen).toMatchObject({
      href: "/app/filming/f-1",
      label: "Κυψέλη Καφέ · Παρασκευή 06/11 09:00–13:00",
      day: "06",
      stateLabel: "Προγραμματισμένο",
      isUpcoming: true,
      endsAt: "2026-11-06T11:00:00.000Z",
    });
    expect(hidden).toMatchObject({ href: null, stateLabel: "Αναμένει έγκριση", isUpcoming: false });
    expect(hidden?.label).not.toContain("·");
  });

  it("χωρίς Πελάτη, το όνομα είναι ο τίτλος της Παραγωγής", () => {
    const [view] = reservationViewsOf([reservation()], [filming({ client: null })], NOW);
    expect(view?.label.startsWith("Social Νοεμβρίου · ")).toBe(true);
  });
});

describe("conflictPairsOf", () => {
  it("ζευγαρώνει μόνο Δεσμεύσεις με σήμα σύγκρουσης που επικαλύπτονται", () => {
    const views = reservationViewsOf(
      [
        reservation({ filmingId: "a", conflict: true }),
        reservation({ filmingId: "b", conflict: true, startsAt: "2026-11-06T09:00:00Z" }),
        reservation({ filmingId: "c", startsAt: "2026-11-06T08:00:00Z" }),
        reservation({ filmingId: "d", conflict: true, startsAt: "2026-11-20T08:00:00Z" }),
      ],
      [],
      NOW,
    );
    expect(conflictPairsOf(views).map(({ a, b }) => `${a.key}-${b.key}`)).toEqual(["a-b"]);
  });
});

describe("candidateViewsOf", () => {
  it("προσφέρει μόνο ανοιχτά Γυρίσματα όπου δεν είναι ήδη δεσμευμένο", () => {
    const candidates = candidateViewsOf(
      [filming(), filming({ id: "f-2", startsAt: "2026-11-09T08:00:00Z", hours: 2 })],
      [reservation()],
    );
    expect(candidates).toEqual([
      {
        id: "f-2",
        label: "Κυψέλη Καφέ · Δευτέρα 09/11 10:00–12:00",
        startsAt: "2026-11-09T08:00:00Z",
        endsAt: "2026-11-09T10:00:00.000Z",
      },
    ]);
  });
});

describe("historyRowsOf", () => {
  it("δείχνει την ημέρα της Αθήνας, το κείμενο και ποιος", () => {
    const lines: HistoryLine[] = [
      { at: "2026-10-31T23:30:00Z", actor: "Άννα", text: "Προστέθηκε στο μητρώο." },
    ];
    expect(historyRowsOf(lines)).toEqual([
      { key: "2026-10-31T23:30:00Z-0", when: "01/11/2026", text: "Προστέθηκε στο μητρώο.", by: "Άννα" },
    ]);
  });
});
