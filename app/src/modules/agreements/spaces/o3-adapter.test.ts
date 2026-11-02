import { describe, expect, it } from "vitest";

import {
  decimalText,
  forwardText,
  limitTextOf,
  limitsField,
  termsHref,
} from "./o3-adapter";

describe("decimalText", () => {
  it("should write decimals with a comma", () => {
    expect(decimalText(12.5)).toBe("12,5");
  });
});

describe("termsHref", () => {
  it("should keep the term set in the address", () => {
    expect(termsHref("one_off")).toBe("/app/settings/agreements?set=one_off");
  });
});

describe("forwardText", () => {
  it("should say how many existing proposals and agreements stay as they are", () => {
    expect(forwardText({ openProposals: 3, liveAgreements: 7 })).toContain(
      "3 ανοιχτές προτάσεις και 7 Συμφωνίες",
    );
  });
});

describe("limitsField", () => {
  const kinds = [
    { id: "a", revisionLimit: 2 },
    { id: "b", revisionLimit: null },
  ];
  it("should keep untouched kinds as the database has them", () => {
    expect(limitTextOf({ id: "a", revisionLimit: 2 }, {})).toBe("2");
    expect(JSON.parse(limitsField(kinds, {}))).toEqual([
      { kindId: "a", rounds: 2 },
      { kindId: "b", rounds: null },
    ]);
  });
  it("should send text that is not a number as is so the server rejects it", () => {
    expect(JSON.parse(limitsField(kinds, { a: "δύο", b: "" }))).toEqual([
      { kindId: "a", rounds: "δύο" },
      { kindId: "b", rounds: null },
    ]);
  });
});
