import { expect, test } from "vitest";

import { matchesNumber } from "./invoices-search";

test("ο αριθμός Τιμολογίου βρίσκεται με κομμάτι του, χωρίς κεφαλαία", () => {
  expect(matchesNumber("ΤΠΥ-0012", "τπυ-00")).toBe(true);
  expect(matchesNumber("ΤΠΥ-0012", " 0012 ")).toBe(true);
  expect(matchesNumber("ΤΠΥ-0012", "0013")).toBe(false);
});
