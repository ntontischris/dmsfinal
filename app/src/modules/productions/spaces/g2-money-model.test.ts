import { describe, expect, it } from "vitest";

import { coverageOf } from "./g2-money-model";

describe("coverageOf", () => {
  it("should call a fully covered billable invoiced", () => {
    expect(coverageOf(500, 500).word).toBe("τιμολογήθηκε");
  });

  it("should call a partly covered billable partly invoiced", () => {
    expect(coverageOf(500, 200).word).toBe("μερικώς τιμολογημένο");
  });

  it("should call an uncovered billable waiting for an invoice", () => {
    expect(coverageOf(500, 0)).toEqual({ word: "προς τιμολόγηση", tone: "attention" });
  });
});
