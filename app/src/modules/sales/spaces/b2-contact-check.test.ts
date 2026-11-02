import { expect, test } from "vitest";

import { contactErrors, contactSavedText } from "./b2-contact-check";

test("χρειάζεται όνομα επαφής και τηλέφωνο ή email", () => {
  expect(contactErrors({ name: " ", phone: "", email: "", city: "" })).toEqual([
    "Γράψε το όνομα του κύριου προσώπου.",
    "Γράψε τηλέφωνο ή email.",
  ]);
});

test("λάθος email το λέει", () => {
  expect(
    contactErrors({ name: "Μαρία", phone: "", email: "maria", city: "" }),
  ).toEqual(["Το email δεν μοιάζει σωστό."]);
});

test("σωστά στοιχεία: κανένα λάθος, και το μήνυμα λέει τι άλλαξε", () => {
  const before = { name: "Μαρία", phone: "2310 1", email: "m@x.gr", city: "Θεσσαλονίκη" };
  const after = { ...before, phone: "2310 2" };
  expect(contactErrors(after)).toEqual([]);
  expect(contactSavedText(before, after)).toBe(
    "Αποθηκεύτηκε: τηλέφωνο 2310 2. Το βλέπει όλη η ομάδα που έχει πρόσβαση στον Πελάτη.",
  );
  expect(contactSavedText(before, before)).toBe("Δεν άλλαξε τίποτα.");
});
