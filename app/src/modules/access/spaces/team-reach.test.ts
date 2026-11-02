import { expect, test } from "vitest";

import type { PermissionDef, RoleSummary } from "../queries";
import {
  grantsOf,
  reachRow,
  roleNames,
  roleReach,
  roleReachText,
  userReachText,
} from "./team-reach";

const perm = (code: string, area: string): PermissionDef => ({
  code,
  kind: "team",
  area,
  label: code,
  scopes: ["all", "mine"],
});

const PERMISSIONS: readonly PermissionDef[] = [
  perm("clients.view", "Πελάτες και Πωλήσεις"),
  perm("catalogue.view", "Κατάλογος"),
  perm("filming.view", "Γυρίσματα"),
  perm("finance.amounts", "Οικονομικά"),
  { ...perm("c.book", "Πελάτης"), kind: "client" },
];

const role = (overrides: Partial<RoleSummary> = {}): RoleSummary => ({
  id: "r-1",
  name: "Πωλήσεις",
  description: "",
  kind: "team",
  isOwner: false,
  isBuiltin: true,
  grants: {},
  holders: [],
  ...overrides,
});

const sales = role({
  grants: {
    "clients.view": "mine",
    "catalogue.view": "all",
    "finance.amounts": "mine",
  },
});
const production = role({
  id: "r-2",
  name: "Παραγωγή",
  grants: { "filming.view": "mine" },
});
const events = role({
  id: "r-3",
  name: "Εκδηλώσεις",
  grants: { "filming.view": "all" },
});
const owner = role({ id: "r-0", name: "Ιδιοκτήτης", isOwner: true });

test("η Παραγωγή δεν βλέπει οικονομικά", () => {
  expect(roleReach(production, PERMISSIONS).hidden).toContain("Οικονομικά");
  expect(roleReach(production, PERMISSIONS).sees).toContain("Γυρίσματα");
});

test("ο Ιδιοκτήτης βλέπει τα πάντα", () => {
  expect(roleReach(owner, PERMISSIONS)).toEqual({
    sees: [],
    hidden: [],
    isAll: true,
  });
});

test("το «όσα τον αφορούν» λέγεται με συγκεκριμένες λέξεις, ανά περιοχή", () => {
  const text = roleReachText(sales, PERMISSIONS);
  expect(text).toContain(
    "Πελάτες και Πωλήσεις (μόνο Πελάτες και Ευκαιρίες όπου είναι Υπεύθυνος)",
  );
  expect(text).toContain("Οικονομικά (μόνο ποσά των δικών του Συμφωνιών)");
  expect(text).toContain("Κατάλογος");
  expect(text).not.toContain("Κατάλογος (");
  expect(text).not.toContain("Πελάτης");
});

test("χρήστης με δύο Ρόλους: βλέπει την ένωσή τους, με το ευρύτερο Εύρος", () => {
  const text = userReachText([sales, events], PERMISSIONS);
  expect(text).toContain("Γυρίσματα,");
  expect(text).not.toContain("Γυρίσματα (");
  expect(text).toContain("Οι Ρόλοι προστίθενται");
  expect(userReachText([owner], PERMISSIONS)).toBe(
    "Βλέπει και κάνει τα πάντα.",
  );
});

test("το ευρύτερο Εύρος κερδίζει όποια σειρά κι αν έχουν οι Ρόλοι", () => {
  expect(grantsOf([events, production])["filming.view"]).toBe("all");
  expect(grantsOf([production, events])["filming.view"]).toBe("all");
});

test("πίνακας Ρόλων × περιοχών: όλα, μόνο δικά του ή τίποτα", () => {
  const row = reachRow(
    { "clients.view": "mine", "catalogue.view": "all" },
    PERMISSIONS,
  );
  expect(row["Πελάτες και Πωλήσεις"]).toBe("mine");
  expect(row["Κατάλογος"]).toBe("all");
  expect(row["Οικονομικά"]).toBeNull();
  expect(row).not.toHaveProperty("Πελάτης");
});

test("τα ονόματα των Ρόλων με τη σειρά της λίστας, ή παύλα", () => {
  expect(roleNames([owner, sales, production], ["r-2", "r-1"])).toBe(
    "Πωλήσεις · Παραγωγή",
  );
  expect(roleNames([owner], [])).toBe("—");
});
