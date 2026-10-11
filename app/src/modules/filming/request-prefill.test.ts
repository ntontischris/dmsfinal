import { describe, expect, it } from "vitest";

import { parseFromRequest } from "./request-prefill";

const MESSAGE = "7c0c4d6e-2f3a-4b5c-8d9e-0a1b2c3d4e5f";
const CLIENT = "9f8e7d6c-5b4a-4321-8fed-cba987654321";

describe("parseFromRequest", () => {
  it("διαβάζει το Μήνυμα και τον Πελάτη", () => {
    expect(parseFromRequest({ fromRequest: MESSAGE, client: CLIENT })).toEqual({
      messageId: MESSAGE,
      clientId: CLIENT,
    });
  });
  it("δέχεται Αίτημα χωρίς Πελάτη", () => {
    expect(parseFromRequest({ fromRequest: MESSAGE })).toEqual({ messageId: MESSAGE, clientId: null });
  });
  it("αγνοεί Πελάτη που δεν είναι έγκυρος", () => {
    expect(parseFromRequest({ fromRequest: MESSAGE, client: "x" })?.clientId).toBeNull();
  });
  it("δεν προσυμπληρώνει τίποτα χωρίς έγκυρο Μήνυμα", () => {
    expect(parseFromRequest({ fromRequest: "x" })).toBeNull();
    expect(parseFromRequest({})).toBeNull();
  });
});
