import { expect, test } from "vitest";

import { cardFactory } from "../test-factories";
import {
  clientAndTitle,
  deadlineLabel,
  filterOptions,
  filterQueue,
  lateCount,
  productionLabel,
  textQuery,
  waitLabel,
  waitingOn,
} from "./h1-model";

const DIMITRIS = "44444444-4444-4444-8444-444444444444";
const ELENI = "55555555-5555-4555-8555-555555555555";

const team = [
  cardFactory({
    id: "a",
    assigneeId: DIMITRIS,
    assigneeName: "Δημήτρης Ιωάννου",
    client: "Γυμναστήριο Κίνηση",
    isLate: true,
  }),
  cardFactory({
    id: "b",
    assigneeId: ELENI,
    assigneeName: "Ελένη Μαρκου",
    client: "Κυψέλη Καφέ",
  }),
  cardFactory({
    id: "c",
    assigneeId: DIMITRIS,
    assigneeName: "Δημήτρης Ιωάννου",
    client: null,
  }),
  cardFactory({ id: "d" }),
];

test("φίλτρο ανά άτομο και ανά πελάτη", () => {
  const dimitris = filterQueue(team, { person: DIMITRIS });
  expect(dimitris.map((c) => c.id)).toEqual(["a", "c"]);
  const kinisi = filterQueue(team, { client: "Γυμναστήριο Κίνηση" });
  expect(kinisi.map((c) => c.id)).toEqual(["a"]);
});

test("«Καθυστερούν» κρατά μόνο όσα πέρασαν την προθεσμία", () => {
  const late = filterQueue(team, { isLateOnly: true });
  expect(late.length).toBe(lateCount(team));
  expect(late.length).toBeLessThan(team.length);
});

test("οι επιλογές φίλτρου βγαίνουν από τη λίστα, με ονόματα, χωρίς κενά και διπλά", () => {
  const options = filterOptions(team);
  expect(options.people).toEqual([
    { id: DIMITRIS, name: "Δημήτρης Ιωάννου" },
    { id: ELENI, name: "Ελένη Μαρκου" },
  ]);
  expect(options.clients.map((c) => c.name)).toEqual([
    "Γυμναστήριο Κίνηση",
    "Κυψέλη Καφέ",
  ]);
});

test("«Πελάτης — Παραγωγή» χωρίς διπλό όνομα, η Εσωτερική μόνο με τον τίτλο", () => {
  expect(clientAndTitle("Κυψέλη Καφέ", "Μάρτιος")).toBe(
    "Κυψέλη Καφέ — Μάρτιος",
  );
  expect(clientAndTitle("Κυψέλη Καφέ", "Κυψέλη Καφέ Μάρτιος")).toBe(
    "Κυψέλη Καφέ Μάρτιος",
  );
  expect(
    productionLabel(cardFactory({ client: null, production: "Showreel" })),
  ).toBe("Showreel");
});

test("η προθεσμία: ημερομηνία, ή «μετά το Γύρισμα», ή παύλα", () => {
  expect(deadlineLabel(cardFactory({ deadline: "2027-03-10" }))).toBe(
    "10/03/2027",
  );
  expect(deadlineLabel(cardFactory({ filmingId: "f" }))).toBe(
    "μετά το Γύρισμα",
  );
  expect(deadlineLabel(cardFactory())).toBe("—");
});

test("τι περιμένει ο Ανατεθειμένος", () => {
  expect(waitingOn(cardFactory())).toBe("καμία Έκδοση ακόμα");
  expect(waitingOn(cardFactory({ state: "returned", versionCount: 2 }))).toBe(
    "v2 επιστράφηκε από έλεγχο",
  );
  expect(
    waitingOn(cardFactory({ state: "changes_requested", versionCount: 3 })),
  ).toBe("v3: ο πελάτης ζήτησε αλλαγές");
});

test("η αναμονή σε μέρες", () => {
  expect(waitLabel(0)).toBe("από σήμερα");
  expect(waitLabel(1)).toBe("1 μέρα");
  expect(waitLabel(4)).toBe("4 μέρες");
});

test("από τη διεύθυνση κρατά μόνο τις απλές τιμές", () => {
  expect(textQuery({ view: "review", person: ["a", "b"], late: undefined })).toEqual({ view: "review" });
});
