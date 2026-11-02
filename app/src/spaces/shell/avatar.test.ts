import { expect, test } from "vitest";

import { initialsOf } from "@/spaces/shell/avatar";

test("τα αρχικά του avatar βγαίνουν από το όνομα του Χρήστη, κεφαλαία χωρίς τόνο", () => {
  expect(initialsOf("Άρης Κωνσταντίνου")).toBe("ΑΚ");
  expect(initialsOf("Μαρία  Παπαδάκη Νίκου")).toBe("ΜΠ");
});
