import { expect, test } from "vitest";

import { GLOSSARY, explainStatus } from "@/spaces/data/glossary";

// Από το prototype (`data/glossary.test.ts`), χωρίς τους τύπους καταστάσεων του prototype.
test("οι καταστάσεις του Πελάτη (B1) έχουν εξήγηση", () => {
  const missing = ["Υποψήφιος", "Ενεργός", "Ανενεργός"].filter((state) => explainStatus(state).length === 0);
  expect(missing).toEqual([]);
});

test("η εξήγηση βρίσκεται χωρίς κεφαλαία και κενά στις άκρες", () => {
  const [entry] = explainStatus("  Ληξιπρόθεσμο ");
  expect(entry?.term).toBe("ληξιπρόθεσμο");
  expect(entry?.meaning.length).toBeGreaterThan(20);
});

test("σήμα με Πορεία πρότασης εξηγεί και τα δύο μέρη", () => {
  expect(explainStatus("πρόταση · Εστάλη").map((entry) => entry.term)).toEqual([
    "πρόταση",
    "εστάλη",
  ]);
});

test("η σημείωση σε παρένθεση δεν εμποδίζει την εξήγηση", () => {
  expect(explainStatus("καθυστερεί (εσωτερικά)").map((entry) => entry.term)).toEqual([
    "καθυστερεί",
  ]);
});

test("σήματα που δεν είναι όροι του γλωσσαριού μένουν χωρίς «τι σημαίνει;»", () => {
  expect(explainStatus("νέο")).toEqual([]);
  expect(explainStatus("εσύ")).toEqual([]);
});

test("οι εξηγήσεις είναι απλές φράσεις, χωρίς κωδικούς οθονών", () => {
  for (const entry of GLOSSARY) {
    expect([entry.term, /\b[A-R]\d{1,2}\b/.test(entry.meaning)]).toEqual([entry.term, false]);
    expect([entry.term, entry.meaning.trim().endsWith(".")]).toEqual([entry.term, true]);
  }
});

test("κάθε όρος γράφεται μία φορά", () => {
  const terms = GLOSSARY.map((entry) => entry.term);
  expect(new Set(terms).size).toBe(terms.length);
});
