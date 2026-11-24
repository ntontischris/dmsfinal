import { expect, test } from "vitest";

import { footOf, isOpenOf } from "./a1-client-model";
import type { CardContent, CardDef, CardRow } from "./a1-model";

const cardOf = (extra: Partial<CardDef> = {}): CardDef => ({
  id: "c",
  title: "Κάρτα",
  source: "A1",
  kind: "action",
  ...extra,
});

const contentOf = (
  rows: readonly CardRow[],
  extra: Partial<CardContent> = {},
): CardContent => ({
  count: rows.length,
  rows,
  allHref: "/",
  emptyText: "Τίποτα σε αναμονή.",
  ...extra,
});

const calm = { label: "Συμβόλαιο Μαΐου", href: "/" };
const red = { label: "Τιμολόγιο 12", href: "/", isUrgent: true };

test("η άδεια κάρτα λέει το κενό της κείμενο και μένει κλειστή", () => {
  const content = contentOf([]);
  expect(footOf(cardOf(), content)).toBe("Τίποτα σε αναμονή.");
  expect(isOpenOf(cardOf(), content)).toBe(false);
});

test("η κάρτα με στοιχεία δείχνει το πρώτο, όχι «Τίποτα»", () => {
  expect(footOf(cardOf(), contentOf([calm, calm]))).toBe("Συμβόλαιο Μαΐου");
});

test("τα επείγοντα μετριούνται και ανοίγουν την κάρτα", () => {
  const content = contentOf([red, calm, red]);
  expect(footOf(cardOf(), content)).toBe("2 επείγοντα");
  expect(isOpenOf(cardOf(), content)).toBe(true);
});

test("η ήπια κάρτα δεν λέει «επείγον» ούτε ανοίγει μόνη της", () => {
  const card = cardOf({ isGentle: true });
  const content = contentOf([red]);
  expect(footOf(card, content)).toBe("Τιμολόγιο 12");
  expect(isOpenOf(card, content)).toBe(false);
});

test("πλήθος χωρίς γραμμές λέει πόσα περιμένουν", () => {
  expect(footOf(cardOf(), contentOf([], { count: 3 }))).toBe("3 σε αναμονή");
});
