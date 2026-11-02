import { expect, it } from "vitest";

import { toFormData } from "./f-run";

it("φτιάχνει FormData με ένα πεδίο ανά τιμή, και πολλές τιμές για λίστα", () => {
  const form = toFormData({ name: "Βασικό", itemIds: ["a", "b"], note: "" });
  expect(form.get("name")).toBe("Βασικό");
  expect(form.getAll("itemIds")).toEqual(["a", "b"]);
  expect(form.get("note")).toBe("");
});
