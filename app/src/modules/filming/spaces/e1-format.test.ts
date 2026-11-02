import { expect, test } from "vitest";

import { countLabel, waitingLabel } from "./e1-format";

test("ενικός για 1, πληθυντικός για τα υπόλοιπα", () => {
  expect(countLabel(1, "μέρα", "μέρες")).toBe("1 μέρα");
  expect(countLabel(0, "μέρα", "μέρες")).toBe("0 μέρες");
  expect(countLabel(3, "άτομο", "άτομα")).toBe("3 άτομα");
});

test("η αναμονή γράφεται σωστά και για 1 ώρα", () => {
  expect(waitingLabel(1)).toBe("1 ώρα");
  expect(waitingLabel(5)).toBe("5 ώρες");
  expect(waitingLabel(72)).toBe("3 ημέρες");
});
