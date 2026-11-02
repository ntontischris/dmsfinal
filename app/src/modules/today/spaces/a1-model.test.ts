import { expect, test } from "vitest";

import { countWord, greetingAt, vocativeOf } from "./a1-model";

test("ο χαιρετισμός βάζει το όνομα στην κλητική", () => {
  expect(vocativeOf("Δημήτρης")).toBe("Δημήτρη");
  expect(vocativeOf("Γιώργος")).toBe("Γιώργο");
  expect(vocativeOf("Άρης")).toBe("Άρη");
  expect(vocativeOf("Νίκος")).toBe("Νίκο");
  expect(vocativeOf("Κώστας")).toBe("Κώστα");
  expect(vocativeOf("Άννα")).toBe("Άννα");
  expect(vocativeOf("Ελένη")).toBe("Ελένη");
});

test("ο αριθμός παίρνει ενικό ή πληθυντικό", () => {
  expect(countWord(1, "Πελάτη", "Πελάτες")).toBe("1 Πελάτη");
  expect(countWord(3, "Πελάτη", "Πελάτες")).toBe("3 Πελάτες");
  expect(countWord(0, "κράτηση", "κρατήσεις")).toBe("0 κρατήσεις");
});

test("ο χαιρετισμός ακολουθεί την ώρα της μέρας", () => {
  expect(greetingAt("2026-09-20T08:00")).toBe("Καλημέρα");
  expect(greetingAt("2026-09-20T12:00")).toBe("Καλημέρα");
  expect(greetingAt("2026-09-20T15:00")).toBe("Καλησπέρα");
  expect(greetingAt("2026-09-20T21:30")).toBe("Καλησπέρα");
  expect(greetingAt("2026-09-20T02:00")).toBe("Καλησπέρα");
});
