import { expect, test } from "vitest";

import type { CardDef, CardRow } from "./a1-model";
import { pickStats } from "./a1-stats";

const built = (rows: readonly CardRow[], extra: Partial<CardDef> = {}) => {
  const content = { count: rows.length, rows, allHref: "/all", emptyText: "" };
  const card: CardDef = {
    id: "c",
    title: "Κάρτα",
    source: "A1",
    kind: "action",
    ...extra,
  };
  return [{ card, content }];
};

test("ένα επείγον γράφεται στον ενικό", () => {
  expect(
    pickStats(built([{ label: "Α", href: "/a", isUrgent: true }]))[0].hint,
  ).toBe("1 επείγον");
});

test("οι ήπιες κάρτες (πελάτης) δεν βάφονται κόκκινες ούτε λένε «επείγον»", () => {
  const [stat] = pickStats(
    built([{ label: "Α", href: "/a", isUrgent: true }], { isGentle: true }),
  );
  expect(stat.tone).toBeUndefined();
  expect(stat.hint).toBe("περιμένουν την απάντησή σου");
});
