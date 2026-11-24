import { expect, test } from "vitest";

import { nowOf } from "./a1-now";
import type { CardDef, CardKind, CardRow } from "./a1-model";

const cardOf = (kind: CardKind, rows: readonly CardRow[], title = "Κάρτα") => {
  const content = { count: rows.length, rows, allHref: "/all", emptyText: "" };
  const card: CardDef = {
    id: title,
    title,
    source: "A1",
    kind,
  };
  return { card, content };
};

test("το Τώρα είναι η πρώτη επείγουσα γραμμή, με τη σειρά των καρτών", () => {
  const built = [
    cardOf("action", [{ label: "Α", href: "/a" }]),
    cardOf(
      "action",
      [{ label: "Β", href: "/b", meta: "σήμερα", isUrgent: true }],
      "Παραδοτέα",
    ),
    cardOf("action", [{ label: "Γ", href: "/c", isUrgent: true }]),
  ];
  expect(nowOf(built)).toEqual({
    cardId: "Παραδοτέα",
    label: "Παραδοτέα",
    title: "Β",
    detail: "σήμερα",
    action: "Άνοιξε",
    href: "/b",
  });
});

test("χωρίς επείγον δεν υπάρχει Τώρα", () => {
  expect(nowOf([cardOf("action", [{ label: "Α", href: "/a" }])])).toBeNull();
});

test("κάρτες ενημέρωσης και κατάστασης δεν δίνουν Τώρα", () => {
  expect(
    nowOf([cardOf("info", [{ label: "Α", href: "/a", isUrgent: true }])]),
  ).toBeNull();
  expect(
    nowOf([cardOf("status", [{ label: "Α", href: "/a", isUrgent: true }])]),
  ).toBeNull();
});

test("άδειες κάρτες (κενή κατάσταση) δεν δίνουν Τώρα", () => {
  expect(nowOf([cardOf("action", [])])).toBeNull();
});

test("Τ8: το Τώρα του «Προς τιμολόγηση» λέει ότι είναι ένας Πελάτης, όχι το σύνολο", () => {
  const { card, content } = cardOf(
    "action",
    [{ label: "Πελάτης Α", href: "/i1", meta: "1.300 €", isUrgent: true }],
    "Προς τιμολόγηση",
  );
  expect(
    nowOf([{ card: { ...card, id: "to_invoice" }, content }]),
  ).toMatchObject({
    label: "Περιμένει πιο πολύ για τιμολόγηση",
    title: "Πελάτης Α",
  });
});
