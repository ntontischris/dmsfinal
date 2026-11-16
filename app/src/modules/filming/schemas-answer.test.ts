import { describe, expect, it } from "vitest";

import {
  answerReasonSchema,
  answerSchema,
  offerTimesSchema,
  pickOfferSchema,
} from "./schemas-answer";

const ID = "6f1c2b8e-3a4d-4c5e-9f60-7a8b9c0d1e2f";
const TIME = "2026-11-20T08:00:00+00:00";

describe("answerSchema", () => {
  it("should accept an answer of a known kind and default the kind label", () => {
    const parsed = answerSchema.parse({
      filmingId: ID,
      kind: "cancel",
      answer: "offer",
    });
    expect(parsed).toEqual({
      filmingId: ID,
      kind: "cancel",
      answer: "offer",
      kindLabel: "",
    });
  });

  it("should refuse an unknown answer with a plain message", () => {
    const result = answerSchema.safeParse({
      filmingId: ID,
      kind: "booking",
      answer: "maybe",
    });
    expect(result.error?.issues[0].message).toBe("Διάλεξε τι απαντάς.");
  });
});

describe("answerReasonSchema", () => {
  it("should require a reason for the client", () => {
    const result = answerReasonSchema.safeParse({
      filmingId: ID,
      kind: "booking",
      reason: "   ",
    });
    expect(result.error?.issues[0].message).toBe(
      "Γράψε στον Πελάτη έναν λόγο.",
    );
  });
});

describe("offerTimesSchema", () => {
  it("should accept the offered times with their offset", () => {
    expect(
      offerTimesSchema.safeParse({ filmingId: ID, times: [TIME], note: "" })
        .success,
    ).toBe(true);
  });

  it("should require at least one time", () => {
    const result = offerTimesSchema.safeParse({
      filmingId: ID,
      times: [],
      note: "",
    });
    expect(result.error?.issues[0].message).toBe(
      "Διάλεξε τουλάχιστον μία ώρα.",
    );
  });

  it("should refuse a time that is not a time", () => {
    expect(
      offerTimesSchema.safeParse({ filmingId: ID, times: ["αύριο"], note: "" })
        .success,
    ).toBe(false);
  });
});

describe("pickOfferSchema", () => {
  it("should accept the time the client pressed", () => {
    expect(pickOfferSchema.parse({ filmingId: ID, startsAt: TIME })).toEqual({
      filmingId: ID,
      startsAt: TIME,
    });
  });
});
