import { expect, test } from "vitest";

import {
  boardOf,
  canDrag,
  filterBoard,
  movesFor,
  NO_FILTERS,
  type BoardCaps,
} from "./e1-board-model";
import type { E1Filming } from "./e1-groups";

const HOUR = 3_600_000;
const DAY = 24 * HOUR;
const NOW = Date.parse("2026-11-16T10:00:00Z");
const TODAY = "2026-11-16";

const filmingOf = (overrides: Partial<E1Filming> = {}): E1Filming => ({
  id: "f1",
  date: TODAY,
  start: "14:00",
  end: "16:00",
  startsAtMs: NOW + 2 * HOUR,
  endsAtMs: NOW + 4 * HOUR,
  state: "scheduled",
  clientId: "c1",
  clientName: "Κυψέλη Καφέ",
  productionTitle: "Social Νοεμβρίου",
  location: null,
  crew: { confirmed: 1, total: 2 },
  crewUserIds: ["u1", "u2"],
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

const past = (id: string, state: E1Filming["state"], daysAgo: number) =>
  filmingOf({
    id,
    state,
    date: new Date(NOW - daysAgo * DAY).toISOString().slice(0, 10),
    startsAtMs: NOW - daysAgo * DAY,
    endsAtMs: NOW - daysAgo * DAY + HOUR,
  });

const ALL: BoardCaps = { canApprove: true, canBook: true, canCrew: true };
const NONE: BoardCaps = { canApprove: false, canBook: false, canCrew: false };

const idsOf = (filmings: readonly E1Filming[]) => filmings.map((f) => f.id);

test("κάθε Γύρισμα μπαίνει στη στήλη της κατάστασης και της ώρας του", () => {
  const board = boardOf(
    [
      filmingOf({ id: "p", state: "pending" }),
      filmingOf({ id: "s" }),
      past("late", "scheduled", 1),
      past("done", "done", 2),
      past("rej", "rejected", 3),
    ],
    NOW,
  );
  expect(board.map((c) => [c.id, idsOf(c.filmings)])).toEqual([
    ["pending", ["p"]],
    ["scheduled", ["s"]],
    ["needs_outcome", ["late"]],
    ["closed", ["done", "rej"]],
  ]);
  expect(board.find((c) => c.id === "needs_outcome")?.isAttention).toBe(true);
});

test("τα Κλειστά κρατούν μόνο τις τελευταίες 30 ημέρες, πιο πρόσφατο πρώτο", () => {
  const board = boardOf(
    [past("old", "done", 31), past("a", "done", 20), past("b", "cancelled", 2)],
    NOW,
  );
  expect(idsOf(board[3]!.filmings)).toEqual(["b", "a"]);
});

test("τα ανοιχτά πάνε από το πιο κοντινό", () => {
  const board = boardOf(
    [
      filmingOf({
        id: "later",
        startsAtMs: NOW + 5 * DAY,
        endsAtMs: NOW + 5 * DAY + HOUR,
      }),
      filmingOf({ id: "soon" }),
    ],
    NOW,
  );
  expect(idsOf(board[1]!.filmings)).toEqual(["soon", "later"]);
});

test("οι επιτρεπτές μετακινήσεις, και καμία αλλού", () => {
  const pending = filmingOf({ state: "pending" });
  const late = past("late", "scheduled", 1);
  expect(movesFor(pending, "scheduled", NOW, ALL)).toEqual(["approve"]);
  expect(movesFor(pending, "closed", NOW, ALL)).toEqual(["reject"]);
  expect(movesFor(pending, "needs_outcome", NOW, ALL)).toEqual([]);
  expect(movesFor(filmingOf(), "closed", NOW, ALL)).toEqual(["cancel"]);
  expect(movesFor(filmingOf(), "pending", NOW, ALL)).toEqual([]);
  expect(movesFor(late, "closed", NOW, ALL)).toEqual([
    "done",
    "noshow",
    "cancel",
  ]);
  expect(movesFor(late, "scheduled", NOW, ALL)).toEqual(["move"]);
  expect(movesFor(late, "needs_outcome", NOW, ALL)).toEqual([]);
});

test("η αναίρεση γυρίζει μόνο το «έγινε» και το «δεν έγινε», στη στήλη που θα πάει", () => {
  expect(movesFor(past("d", "done", 2), "needs_outcome", NOW, ALL)).toEqual([
    "undo",
  ]);
  expect(movesFor(past("d", "no_show", 2), "scheduled", NOW, ALL)).toEqual([]);
  expect(
    movesFor(past("c", "cancelled", 2), "needs_outcome", NOW, ALL),
  ).toEqual([]);
});

test("ό,τι δεν δικαιούται ο θεατής δεν σύρεται", () => {
  const pending = filmingOf({ state: "pending" });
  expect(canDrag(pending, NOW, ALL)).toBe(true);
  expect(canDrag(pending, NOW, NONE)).toBe(false);
  expect(
    movesFor(pending, "scheduled", NOW, { ...ALL, canApprove: false }),
  ).toEqual([]);
  expect(
    movesFor(past("late", "scheduled", 1), "closed", NOW, {
      ...NONE,
      canBook: true,
    }),
  ).toEqual(["cancel"]);
  expect(canDrag(past("r", "rejected", 2), NOW, ALL)).toBe(false);
});

test("τα φίλτρα: Πελάτης, Ποιος πάει, Περίοδος, Θέλει προσοχή", () => {
  const filmings = [
    filmingOf({ id: "a" }),
    filmingOf({
      id: "b",
      clientId: "c2",
      crewUserIds: ["u3"],
      date: "2026-11-30",
    }),
    filmingOf({
      id: "c",
      date: "2026-12-02",
      signals: { ...filmingOf().signals, crewDeclined: true },
    }),
    past("late", "scheduled", 1),
  ];
  const run = (filters: Partial<typeof NO_FILTERS>) =>
    idsOf(
      filterBoard(
        filmings,
        { ...NO_FILTERS, ...filters },
        { nowMs: NOW, today: TODAY },
      ),
    );
  expect(run({})).toEqual(["a", "b", "c", "late"]);
  expect(run({ clientId: "c2" })).toEqual(["b"]);
  expect(run({ crewUserId: "u3" })).toEqual(["b"]);
  expect(run({ period: { kind: "week" } })).toEqual(["a"]);
  expect(run({ period: { kind: "month" } })).toEqual(["a", "b", "late"]);
  expect(
    run({ period: { kind: "range", from: "2026-11-30", to: "2026-12-31" } }),
  ).toEqual(["b", "c"]);
  expect(run({ isCareOnly: true })).toEqual(["c", "late"]);
});
