import { expect, test } from "vitest";

import { matchesSearch } from "@/spaces/data/search-match";

test("χωρίς τόνους και κεφαλαία: «είσπραξη» βρίσκει τις «Εισπράξεις»", () => {
  expect(matchesSearch("Εισπράξεις", "είσπραξη")).toBe(true);
});

test("μισή λέξη αρκεί: «έξοδ» βρίσκει τα «Έξοδα»", () => {
  expect(matchesSearch("Έξοδα", "έξοδ")).toBe(true);
});

test("ο πληθυντικός βρίσκει τον ενικό: «reels» βρίσκει «Reel: φθινοπωρινό μενού»", () => {
  expect(matchesSearch("Reel: φθινοπωρινό μενού", "reels")).toBe(true);
});

test("κάθε λέξη πρέπει να ταιριάζει, οι μικρές λέξεις αγνοούνται", () => {
  expect(matchesSearch("Τζίρος ανά Πελάτη", "τζίρος ανά πελάτες")).toBe(true);
  expect(matchesSearch("Τζίρος ανά Πελάτη", "τζίρος υπηρεσία")).toBe(false);
});

test("δεν βρίσκει λέξη που απλώς περιέχεται στη μέση άλλης", () => {
  expect(matchesSearch("Παραδοτέα", "δοτ")).toBe(false);
});

test("κενή αναζήτηση ταιριάζει με όλα", () => {
  expect(matchesSearch("Οτιδήποτε", "  ")).toBe(true);
});
