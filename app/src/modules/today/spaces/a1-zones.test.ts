import { expect, test } from "vitest";

import type { CardDef, CardKind, CardRow } from "./a1-model";
import { splitUrgent, withoutRepeats, zonesOf } from "./a1-zones";

const built = (
  id: string,
  kind: CardKind,
  rows: readonly CardRow[] = [],
  extra: Partial<CardDef> = {},
) => {
  const content = { count: rows.length, rows, allHref: "/", emptyText: "" };
  const card: CardDef = {
    id,
    title: id,
    source: "A1",
    kind,
    ...extra,
  };
  return { card, content };
};

const ids = (items: readonly { card: CardDef }[]) =>
  items.map((i) => i.card.id);
const red = { label: "x", href: "/", isUrgent: true };
const calm = { label: "y", href: "/" };

test("οι κάρτες μοιράζονται σε επείγοντα, σε αναμονή και για ενημέρωση", () => {
  const zones = zonesOf([
    built("a", "action", [calm]),
    built("b", "action", [red]),
    built("week", "info"),
  ]);
  expect(ids(zones.urgent)).toEqual(["b"]);
  expect(ids(zones.waiting)).toEqual(["a"]);
  expect(ids(zones.info)).toEqual(["week"]);
});

test("οι τεχνικές κάρτες χωρίς πρόβλημα πάνε στο «Περισσότερα»", () => {
  const zones = zonesOf([
    built("health", "status", [], { isTechnical: true }),
    built("google", "action", [calm], { isTechnical: true }),
  ]);
  expect(ids(zones.more)).toEqual(["health", "google"]);
  expect(zones.info).toEqual([]);
});

test("τεχνική κάρτα με πρόβλημα μένει στα επείγοντα", () => {
  const zones = zonesOf([
    built("health", "status", [red], { isTechnical: true }),
  ]);
  expect(ids(zones.urgent)).toEqual(["health"]);
});

test("οι ήπιες κάρτες (πελάτης) δεν μπαίνουν στα επείγοντα", () => {
  const zones = zonesOf([built("c", "action", [red], { isGentle: true })]);
  expect(ids(zones.waiting)).toEqual(["c"]);
});

test("γραμμή που φάνηκε σε προηγούμενη κάρτα ή στο Τώρα δεν ξαναφαίνεται", () => {
  const item = { label: "Κίνηση", href: "/E3?id=f1" };
  const now = { label: "Μέλι", href: "/B4?id=o1" };
  const result = withoutRepeats(
    [
      built("approvals", "action", [item]),
      built("steps", "action", [{ ...now, isUrgent: true }]),
      built("week", "info", [
        { label: "Κίνηση, Αθήνα", href: "/E3?id=f1" },
        { label: "Κυψέλη", href: "/E3?id=f2" },
      ]),
    ],
    now,
  );
  expect(ids(result)).toEqual(["approvals", "week"]);
  expect(result[1].content.rows.map((r) => r.href)).toEqual(["/E3?id=f2"]);
  expect(result[1].content.count).toBe(1);
});

test("γενικοί σύνδεσμοι (χωρίς συγκεκριμένο στοιχείο) δεν κόβονται", () => {
  const result = withoutRepeats(
    [
      built("a", "action", [{ label: "x", href: "/B5" }]),
      built("b", "action", [{ label: "y", href: "/B5" }]),
    ],
    null,
  );
  expect(ids(result)).toEqual(["a", "b"]);
});

test("το επόμενο Γύρισμα δεν φαίνεται δεύτερη φορά όταν έγινε Τώρα, ακόμα κι αν έχει Χάρτη", () => {
  const row = { label: "Αύριο", href: "/E6?id=f1", isUrgent: true };
  const card = built("next", "action", [row]);
  const withCta = {
    ...card,
    content: { ...card.content, cta: { label: "Χάρτης", href: "/map" } },
  };
  expect(withoutRepeats([withCta], row)).toEqual([]);
});

test("τα επείγοντα πάνω είναι έως 3· τα υπόλοιπα περιμένουν κλειστά", () => {
  const items = ["a", "b", "c", "d", "e"].map((id) =>
    built(id, "action", [red]),
  );
  const { shown, rest } = splitUrgent(items);
  expect(ids(shown)).toEqual(["a", "b", "c"]);
  expect(ids(rest)).toEqual(["d", "e"]);
});
