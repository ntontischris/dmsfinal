import { expect, test } from "vitest";

import {
  boardFiltersOf,
  boardFilterGroups,
  boardHref,
  boardParamsSchema,
} from "./e1-board-params";

const C1 = "11111111-1111-4111-8111-111111111111";
const U1 = "22222222-2222-4222-8222-222222222222";
const ME = "33333333-3333-4333-8333-333333333333";
const TODAY = "2026-11-16";

test("ο Πίνακας είναι η προεπιλογή, τα άκυρα πεδία αγνοούνται", () => {
  expect(boardParamsSchema.parse({})).toEqual({ view: "board", period: "all" });
  expect(
    boardParamsSchema.parse({
      view: "list",
      client: "x",
      period: "nope",
      care: "1",
    }),
  ).toEqual({ view: "list", period: "all", care: "1" });
});

test("τα πεδία της διεύθυνσης γίνονται φίλτρα· το «από–έως» χωρίς ημέρες παίρνει τις επόμενες 30", () => {
  const params = boardParamsSchema.parse({
    client: C1,
    crew: U1,
    period: "range",
    care: "1",
  });
  expect(boardFiltersOf(params, TODAY)).toEqual({
    clientId: C1,
    crewUserId: U1,
    period: { kind: "range", from: TODAY, to: "2026-12-16" },
    isCareOnly: true,
  });
});

test("κάθε επιλογή κρατά τα άλλα φίλτρα και αλλάζει μόνο το δικό της", () => {
  const params = boardParamsSchema.parse({ client: C1, period: "week" });
  expect(boardHref(params, { client: undefined })).toBe(
    "/app/filming?period=week",
  );
  expect(boardHref(params, { view: "list" })).toBe(
    `/app/filming?view=list&client=${C1}&period=week`,
  );
});

test("οι κάρτες φίλτρων: Πελάτης, Ποιος πάει με «μόνο τα δικά μου», Περίοδος, Θέλει προσοχή", () => {
  const params = boardParamsSchema.parse({ crew: ME });
  const groups = boardFilterGroups(params, {
    clients: [{ id: C1, name: "Κυψέλη" }],
    crew: [
      { id: U1, name: "Νίκος" },
      { id: ME, name: "Εγώ" },
    ],
    viewerId: ME,
  });
  expect(groups.map((g) => g.label)).toEqual([
    "Πελάτης",
    "Ποιος πάει",
    "Περίοδος",
    "Θέλει προσοχή",
  ]);
  const crew = groups[1]!;
  expect(crew.options.map((o) => [o.label, o.isCurrent])).toEqual([
    ["Μόνο τα δικά μου", true],
    ["Νίκος", false],
  ]);
  expect(crew.all?.isCurrent).toBe(false);
});

test("ο Χρήστης πελάτη δεν έχει «Πελάτη» ούτε «Ποιος πάει»", () => {
  const groups = boardFilterGroups(boardParamsSchema.parse({}), {
    clients: [],
    crew: null,
    viewerId: ME,
  });
  expect(groups.map((g) => g.label)).toEqual(["Περίοδος", "Θέλει προσοχή"]);
});
