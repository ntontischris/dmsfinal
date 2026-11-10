import { describe, expect, it } from "vitest";

import type { Catalog, CatalogEvent } from "../automation-view-schema";
import { eventsFor, k1Href, parseGroup, parseOnly } from "./k1-model";

const event = (overrides: Partial<CatalogEvent> = {}): CatalogEvent => ({
  code: "invoice.registered",
  number: 1,
  group: "Ι",
  kind: "instant",
  label: "Νέο Τιμολόγιο",
  labelEn: "New invoice",
  caseOf: "Καταχωρήθηκε Τιμολόγιο",
  variables: [],
  relatives: [],
  hasVisitor: false,
  isCostOnly: false,
  isClientFacing: false,
  isWired: true,
  activeCount: 1,
  totalCount: 2,
  ...overrides,
});

const catalog: Catalog = {
  groups: [
    { code: "Ι", label: "Τιμολόγια" },
    { code: "Π", label: "Παραγωγές" },
  ],
  events: [
    event({ code: "a.one", group: "Ι", activeCount: 1, isClientFacing: true }),
    event({ code: "a.two", group: "Ι", activeCount: 0 }),
    event({ code: "b.one", group: "Π", activeCount: 2 }),
  ],
};

const codes = (events: readonly CatalogEvent[]) => events.map((e) => e.code);

describe("K1 φίλτρα", () => {
  it("should keep only known groups and filters", () => {
    expect(parseGroup(catalog, "Π")).toBe("Π");
    expect(parseGroup(catalog, "Χ")).toBeUndefined();
    expect(parseOnly("off")).toBe("off");
    expect(parseOnly("wired")).toBe("wired");
    expect(parseOnly("all")).toBeUndefined();
  });

  it("should filter by group and by «Με ενεργούς», «Προς πελάτη», «Όλοι σβηστοί»", () => {
    expect(codes(eventsFor(catalog, "Ι", undefined))).toEqual([
      "a.one",
      "a.two",
    ]);
    expect(codes(eventsFor(catalog, undefined, "active"))).toEqual([
      "a.one",
      "b.one",
    ]);
    expect(codes(eventsFor(catalog, undefined, "client"))).toEqual(["a.one"]);
    expect(codes(eventsFor(catalog, "Ι", "off"))).toEqual(["a.two"]);
  });

  it("should keep only wired events for «Μόνο συνδεδεμένα»", () => {
    const withUnwired: Catalog = {
      ...catalog,
      events: [...catalog.events, event({ code: "c.later", isWired: false })],
    };
    expect(codes(eventsFor(withUnwired, undefined, "wired"))).toEqual([
      "a.one",
      "a.two",
      "b.one",
    ]);
  });

  it("should keep the filters in the address", () => {
    expect(k1Href(undefined, undefined)).toBe("/app/settings/automations");
    expect(k1Href("Π", "active")).toBe(
      "/app/settings/automations?group=%CE%A0&only=active",
    );
  });
});
