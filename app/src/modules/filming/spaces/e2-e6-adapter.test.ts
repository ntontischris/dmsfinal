import { expect, test } from "vitest";

import type { MineEntry, PendingEntry } from "../types";
import type { SheetView } from "../sheet-types";
import { cancelItemOf, pendingItemOf, pendingOldestFirst } from "./e2-adapter";
import { awaitsAnswer, e6SheetOf } from "./e6-adapter";

const NOW = Date.parse("2026-09-20T09:00:00Z");

const pendingOf = (over: Partial<PendingEntry> = {}): PendingEntry => ({
  id: "p1",
  startsAt: "2026-09-21T07:00:00Z",
  hours: 3,
  createdAt: "2026-09-19T09:00:00Z",
  waitingHours: 24.4,
  waitingLong: false,
  client: { id: "c", name: "Κυψέλη" },
  production: { id: "pr", title: "Σεπτέμβριος" },
  provision: {
    given: 4,
    carried: 0,
    used: 1,
    reserved: 1,
    balance: 2,
    kind: { id: "k", label: "Γύρισμα", measure: "per_filming" },
  },
  ...over,
});

test("η κράτηση σε αναμονή γίνεται κάρτα με Παροχή και αναμονή σε ώρες", () => {
  const item = pendingItemOf(pendingOf());
  expect(item.filmingHref).toBe("/app/filming/p1");
  expect(item.waitingHours).toBe(24);
  expect(item.when).toMatch(/^21\/09 .+ 10:00–13:00$/);
  expect(item.balance).toBe(
    "Γύρισμα: 2 από 4 διαθέσιμα μετά από αυτό το Γύρισμα",
  );
});

test("η παλαιότερη κράτηση πρώτη", () => {
  const sorted = pendingOldestFirst([
    pendingOf({ id: "new", createdAt: "2026-09-19T10:00:00Z" }),
    pendingOf({ id: "old", createdAt: "2026-09-18T10:00:00Z" }),
  ]);
  expect(sorted.map((entry) => entry.id)).toEqual(["old", "new"]);
});

test("το αίτημα ακύρωσης μετρά τις ώρες ως το Γύρισμα", () => {
  const item = cancelItemOf(
    {
      id: "c1",
      startsAt: "2026-09-21T09:00:00Z",
      hours: 2,
      requestedAt: "2026-09-20T08:00:00Z",
      reason: "αρρώστια",
      client: null,
      production: { id: "pr", title: "Σεπτέμβριος" },
      willBurn: true,
    },
    NOW,
  );
  expect(item.hoursLeft).toBe(24);
  expect(item.burns).toBe(true);
});

const mineOf = (over: Partial<MineEntry> = {}): MineEntry => ({
  id: "m1",
  startsAt: "2026-09-21T07:00:00Z",
  hours: 3,
  location: "Αθήνα",
  state: "scheduled",
  note: null,
  myResponse: "pending",
  myReason: null,
  myVersion: null,
  sheetVersion: 2,
  production: { id: "pr", title: "Σεπτέμβριος" },
  client: { id: "c", name: "Κυψέλη" },
  ...over,
});

const sheetOf = (): SheetView => ({
  shots: [],
  crewNote: null,
  current: {
    version: 2,
    issuedAt: "2026-09-19T10:00:00Z",
    issuedBy: "Μαρία",
    change: "άλλαξε η ώρα",
  },
  versions: [],
  hasChanges: false,
  canEdit: false,
  canIssue: false,
  latest: {
    startsAt: "2026-09-21T07:00:00Z",
    hours: 3,
    location: "Αθήνα",
    production: "Σεπτέμβριος",
    client: "Κυψέλη",
    crew: [
      { userId: "me", name: "Νίκος" },
      { userId: "x", name: "Ελένη" },
    ],
    equipment: [{ name: "Κάμερα Α" }],
    shots: [{ id: "s", text: "Πλάνο εισόδου" }],
    crewNote: "Νωρίς",
  },
});

test("περιμένει απάντηση όταν δεν απάντησε στην τρέχουσα έκδοση", () => {
  expect(awaitsAnswer(mineOf())).toBe(true);
  expect(awaitsAnswer(mineOf({ myVersion: 2 }))).toBe(false);
  expect(awaitsAnswer(mineOf({ sheetVersion: null }))).toBe(false);
});

test("το Δελτίο του μέλους βγαίνει από το στιγμιότυπο της έκδοσης", () => {
  const view = e6SheetOf(mineOf(), sheetOf(), "me", NOW);
  expect(view).toMatchObject({
    version: 2,
    change: "άλλαξε η ώρα",
    equipment: ["Κάμερα Α"],
    shotList: ["Πλάνο εισόδου"],
    myResponse: "αναμένει",
    awaitsAnswer: true,
  });
  expect(view?.crew).toEqual([
    { name: "Νίκος", isMe: true },
    { name: "Ελένη", isMe: false },
  ]);
  expect(e6SheetOf(mineOf(), null, "me", NOW)).toBeNull();
});
