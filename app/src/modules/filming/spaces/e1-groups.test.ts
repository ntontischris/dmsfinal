import { describe, expect, test } from "vitest";

import type { FilmingRow } from "../types";
import { e1FilmingOf, tabCountLabel, visibleViews } from "./e1-adapter";
import {
  clientStatusLook,
  daysLateLabel,
  groupFilmings,
  signalsOf,
  statusLook,
  type E1Filming,
} from "./e1-groups";

const NOW = Date.parse("2026-09-20T09:00:00Z");

const rowOf = (over: Partial<FilmingRow> = {}): FilmingRow => ({
  id: "f",
  startsAt: "2026-09-21T07:00:00Z",
  hours: 3,
  state: "scheduled",
  client: { id: "c", name: "Κινηση ΑΕ" },
  production: { id: "p", title: "Σεπτέμβριος" },
  crew: { confirmed: 1, total: 2 },
  signals: {
    equipmentConflict: false,
    isExtra: false,
    cancelRequest: false,
    crewDeclined: false,
    slotProblem: null,
    pendingReschedule: null,
  },
  ...over,
});

const filming = (over: Partial<FilmingRow> = {}): E1Filming =>
  e1FilmingOf(rowOf(over));

describe("e1FilmingOf", () => {
  test("μετατρέπει σε ημέρα και ώρες της Αθήνας", () => {
    const item = filming();
    expect(item.date).toBe("2026-09-21");
    expect(item.start).toBe("10:00");
    expect(item.end).toBe("13:00");
    expect(item.clientName).toBe("Κινηση ΑΕ");
  });
});

describe("groupFilmings", () => {
  const rows = [
    filming({ id: "late", startsAt: "2026-09-18T07:00:00Z" }),
    filming({ id: "next", startsAt: "2026-09-21T07:00:00Z" }),
    filming({ id: "oct", startsAt: "2026-10-02T07:00:00Z" }),
    filming({ id: "done", startsAt: "2026-09-17T07:00:00Z", state: "done" }),
    filming({ id: "aug", startsAt: "2026-08-10T07:00:00Z", state: "done" }),
  ];

  test("πρώτα όσα θέλουν «έγινε», μετά τα επόμενα ανά μήνα, στο τέλος τα παλιά ανά μήνα", () => {
    expect(groupFilmings(rows, NOW).map((g) => g.label)).toEqual([
      "Θέλουν «έγινε»",
      "Σεπτέμβριος 2026 · επόμενα",
      "Οκτώβριος 2026 · επόμενα",
      "Σεπτέμβριος 2026 · πέρασαν",
      "Αύγουστος 2026 · πέρασαν",
    ]);
  });

  test("ο πελάτης δεν έχει ομάδα «Θέλουν «έγινε»»· τα βλέπει με τα παλιά", () => {
    const groups = groupFilmings(rows, NOW, { isClient: true });
    expect(groups.map((g) => g.label)).not.toContain("Θέλουν «έγινε»");
    expect(
      groups.find((g) => g.label === "Σεπτέμβριος 2026 · πέρασαν")?.filmings.map((f) => f.id),
    ).toContain("late");
  });

  test("«Επόμενο» είναι το πρώτο ανοιχτό που δεν έχει περάσει, σε μία μόνο ομάδα", () => {
    const groups = groupFilmings(rows, NOW);
    expect(groups[1].nextId).toBe("next");
    expect(groups.filter((g) => g.nextId).length).toBe(1);
  });
});

test("μέρες καθυστέρησης για το «έγινε», με σωστό ενικό και πληθυντικό", () => {
  const late = filming({ startsAt: "2026-09-18T07:00:00Z" });
  expect(daysLateLabel(late, "2026-09-20")).toBe("πριν από 2 ημέρες");
  expect(daysLateLabel(late, "2026-09-19")).toBe("χθες");
  expect(daysLateLabel(late, "2026-09-18")).toBe("σήμερα");
});

describe("statusLook", () => {
  test("όσα τελείωσαν χωρίς σήμανση θέλουν «έγινε»", () => {
    expect(
      statusLook(filming({ startsAt: "2026-09-18T07:00:00Z" }), NOW).tone,
    ).toBe("action");
  });

  test("το «δεν μπορώ» σε μελλοντικό κάνει πρόβλημα", () => {
    const look = statusLook(
      filming({ signals: { ...rowOf().signals, crewDeclined: true } }),
      NOW,
    );
    expect(look).toEqual({
      tone: "problem",
      icon: "!",
      label: "προγραμματισμένο · θέλει κοίταγμα",
    });
  });

  test("το αίτημα ακύρωσης περιμένει απόφαση", () => {
    expect(
      statusLook(
        filming({ signals: { ...rowOf().signals, cancelRequest: true } }),
        NOW,
      ).label,
    ).toBe("ζητήθηκε ακύρωση · εκκρεμεί απόφαση");
  });

  test("κλειστά: έγινε πράσινο, τα υπόλοιπα ξεθωριασμένα", () => {
    expect(statusLook(filming({ state: "done" }), NOW).tone).toBe("ok");
    expect(statusLook(filming({ state: "cancelled" }), NOW)).toEqual({
      tone: "muted",
      icon: "×",
      label: "ακυρώθηκε",
    });
  });
});

test("σήματα μόνο για ζωντανά Γυρίσματα", () => {
  const signals = { ...rowOf().signals, equipmentConflict: true };
  expect(signalsOf(filming({ signals }), NOW)).toEqual([
    { label: "Σύγκρουση εξοπλισμού" },
  ]);
  expect(
    signalsOf(filming({ signals, startsAt: "2026-09-01T07:00:00Z" }), NOW),
  ).toEqual([]);
});

test("ο εγκρίνων βλέπει τα «Αναμένουν έγκριση» στην ουρά, όχι στις προβολές", () => {
  expect(visibleViews(true).map((v) => v.id)).not.toContain("pending");
  expect(visibleViews(false).map((v) => v.id)).toContain("pending");
  expect(tabCountLabel(100)).toBe("100+");
});

test("ο πελάτης δεν έχει την προβολή «Θέλουν «έγινε»»", () => {
  expect(visibleViews(false, true).map((v) => v.id)).not.toContain("needs_outcome");
  expect(visibleViews(false).map((v) => v.id)).toContain("needs_outcome");
});

describe("clientStatusLook", () => {
  test("δείχνει μόνο την κατάσταση, ποτέ «θέλει «έγινε»» ή «θέλει κοίταγμα»", () => {
    const late = filming({ startsAt: "2026-09-18T07:00:00Z" });
    expect(clientStatusLook(late).label).toBe(statusLook(filming(), NOW).label);
    const declined = filming({
      signals: { ...rowOf().signals, crewDeclined: true },
    });
    expect(clientStatusLook(declined).tone).toBe("neutral");
  });

  test("το αίτημα ακύρωσης του πελάτη φαίνεται ως «ζητήθηκε ακύρωση»", () => {
    const asked = filming({ signals: { ...rowOf().signals, cancelRequest: true } });
    expect(clientStatusLook(asked)).toEqual({
      tone: "pending",
      icon: "?",
      label: "ζητήθηκε ακύρωση",
    });
  });
});
