import { expect, test } from "vitest";

import {
  groupsOf,
  ilikePattern,
  pickMatches,
  termSchema,
  visibleKinds,
  type RecordHit,
} from "@/spaces/data/search-records-model";

const hitOf = (id: string): RecordHit => ({ id, label: `Εγγραφή ${id}`, sublabel: null, href: `/app/x/${id}` });

const teamAllows = (requirement: string): boolean => requirement !== "client";
const clientAllows = (requirement: string): boolean =>
  ["client", "c.productions", "c.book", "c.finance"].includes(requirement);

test("ο όρος κόβει τα κενά και θέλει 2 έως 60 χαρακτήρες", () => {
  expect(termSchema.safeParse("  αβ  ").data).toBe("αβ");
  expect(termSchema.safeParse(" α ").success).toBe(false);
  expect(termSchema.safeParse("α".repeat(61)).success).toBe(false);
  expect(termSchema.safeParse(42).success).toBe(false);
});

test("ομαδοποίηση με τη σειρά των ειδών, χωρίς τα άδεια και όσα απέτυχαν, έως 5 ανά είδος", () => {
  const groups = groupsOf([
    { kind: "invoices", hits: [hitOf("i1")] },
    { kind: "clients", hits: ["1", "2", "3", "4", "5", "6"].map(hitOf) },
    { kind: "filmings", hits: [] },
    { kind: "agreements", hits: null },
  ]);
  expect(groups.map((group) => group.label)).toEqual(["Πελάτες", "Τιμολόγια"]);
  expect(groups[0]?.hits).toHaveLength(5);
});

test("η ομάδα με όλα τα Δικαιώματα βλέπει όλα τα είδη", () => {
  expect(visibleKinds(teamAllows)).toEqual([
    "clients",
    "productions",
    "filmings",
    "deliverables",
    "invoices",
    "agreements",
  ]);
});

test("ο πελάτης βλέπει μόνο τα είδη των Χώρων του: ποτέ Πελάτες", () => {
  const kinds = visibleKinds(clientAllows);
  expect(kinds).not.toContain("clients");
  expect(kinds).toEqual(expect.arrayContaining(["productions", "filmings", "invoices"]));
});

test("χωρίς Δικαιώματα κανένα είδος", () => {
  expect(visibleKinds(() => false)).toEqual([]);
});

test("το ταίριασμα από τη λίστα αγνοεί τόνους και κρατά το όριο", () => {
  const rows = ["Καφέ Αθήνα", "Αθηναϊκή Ζυθοποιία", "Βόλος"];
  expect(pickMatches(rows, { term: "αθην", limit: 1, textOf: (row) => row })).toEqual(["Καφέ Αθήνα"]);
});

test("στο ilike τα % και _ ψάχνονται ως χαρακτήρες", () => {
  expect(ilikePattern("50%_a")).toBe(String.raw`%50\%\_a%`);
});
