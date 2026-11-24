import { describe, expect, it } from "vitest";

import { clientOptionsOf, type ClientSource } from "./client-options";

const row = (overrides: Partial<ClientSource> = {}): ClientSource => ({
  id: "6f1c2a4e-8b3d-4c5e-9f7a-1b2c3d4e5f60",
  name: "Καφέ Αθηνά",
  city: "Αθήνα",
  managerName: "Νίκος",
  ...overrides,
});

describe("clientOptionsOf", () => {
  it("should leave a unique name without hint", () => {
    expect(clientOptionsOf([row()])).toEqual([
      { id: row().id, name: "Καφέ Αθηνά" },
    ]);
  });

  it("should add the city when two clients share a name", () => {
    const options = clientOptionsOf([
      row({ id: "a", city: "Αθήνα" }),
      row({ id: "b", city: "Πάτρα" }),
    ]);
    expect(options.map((o) => o.hint)).toEqual(["Αθήνα", "Πάτρα"]);
  });

  it("should match names ignoring case and accents", () => {
    const options = clientOptionsOf([
      row({ id: "a", name: "ΚΑΦΕ ΑΘΗΝΑ", city: "Αθήνα" }),
      row({ id: "b", name: "καφέ αθηνά ", city: "Βόλος" }),
    ]);
    expect(options.every((o) => o.hint !== undefined)).toBe(true);
  });

  it("should add the manager when the city is also shared", () => {
    const options = clientOptionsOf([
      row({ id: "a", managerName: "Νίκος" }),
      row({ id: "b", managerName: "Μαρία" }),
    ]);
    expect(options.map((o) => o.hint)).toEqual([
      "Αθήνα · Νίκος",
      "Αθήνα · Μαρία",
    ]);
  });

  it("should fall back to a short code when nothing else tells them apart", () => {
    const options = clientOptionsOf([
      row({ id: "aaaa1111", city: "", managerName: null }),
      row({ id: "bbbb2222", city: "", managerName: null }),
    ]);
    expect(options.map((o) => o.hint)).toEqual(["κωδ. aaaa11", "κωδ. bbbb22"]);
  });
});
