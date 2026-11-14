import { describe, expect, it } from "vitest";

import { parsePipelineValue } from "./queries-forecast";
import { forecastSchema, stageProbabilitySchema } from "./schemas";

const ID = "11111111-1111-4111-8111-111111111111";
const form = (over: Record<string, string>) => ({
  opportunityId: ID,
  value: "",
  probability: "",
  expectedClose: "",
  keepValue: "",
  ...over,
});

describe("forecastSchema", () => {
  it("κενά πεδία = δεν γράφτηκαν (πρόταση, Στάδιο, χωρίς κλείσιμο)", () => {
    expect(forecastSchema.parse(form({}))).toEqual({
      opportunityId: ID,
      value: null,
      probability: null,
      expectedClose: null,
      keepValue: false,
    });
  });
  it("δέχεται ελληνική υποδιαστολή και τελείες χιλιάδων", () => {
    expect(forecastSchema.parse(form({ value: "1.500,50" })).value).toBe(
      1500.5,
    );
    expect(forecastSchema.parse(form({ value: "2400" })).value).toBe(2400);
    expect(forecastSchema.parse(form({ value: "99.5" })).value).toBe(99.5);
  });
  it("απορρίπτει αρνητική ή μη αριθμητική Αξία", () => {
    expect(forecastSchema.safeParse(form({ value: "-5" })).success).toBe(false);
    expect(forecastSchema.safeParse(form({ value: "πολλά" })).success).toBe(
      false,
    );
  });
  it("Πιθανότητα από 0 έως 100", () => {
    expect(forecastSchema.parse(form({ probability: "0" })).probability).toBe(
      0,
    );
    expect(forecastSchema.parse(form({ probability: "100" })).probability).toBe(
      100,
    );
    const over = forecastSchema.safeParse(form({ probability: "101" }));
    expect(over.success).toBe(false);
    expect(over.error?.issues[0]?.message).toBe(
      "Η Πιθανότητα είναι από 0 έως 100%.",
    );
  });
  it("κλείσιμο ως ημερομηνία και «κρατά την Αξία» με 1", () => {
    const parsed = forecastSchema.parse(
      form({ expectedClose: "2099-03-31", keepValue: "1" }),
    );
    expect(parsed.expectedClose).toBe("2099-03-31");
    expect(parsed.keepValue).toBe(true);
    expect(
      forecastSchema.safeParse(form({ expectedClose: "31/03" })).success,
    ).toBe(false);
  });
});

describe("parsePipelineValue", () => {
  it("μεταφράζει το σύνολο της βάσης", () => {
    expect(
      parsePipelineValue({
        amounts: true,
        open: 4,
        valued: 3,
        total: 9500,
        weighted: 5500,
        thisMonth: { count: 2, weighted: 4600 },
        late: 1,
      }),
    ).toEqual({
      hasAmounts: true,
      open: 4,
      valued: 3,
      total: 9500,
      weighted: 5500,
      thisMonth: { count: 2, weighted: 4600 },
      late: 1,
    });
  });
  it("χωρίς «Βλέπει ποσά» τα ποσά είναι null", () => {
    const value = parsePipelineValue({
      amounts: false,
      open: 4,
      valued: 0,
      total: null,
      weighted: null,
      thisMonth: { count: 2, weighted: null },
      late: 1,
    });
    expect(value.hasAmounts).toBe(false);
    expect(value.total).toBeNull();
  });
});

describe("stageProbabilitySchema", () => {
  it("0–100 ή κενό (κενό = χωρίς προεπιλογή)", () => {
    expect(stageProbabilitySchema.parse({ id: ID, probability: "40" })).toEqual(
      {
        id: ID,
        probability: 40,
      },
    );
    expect(
      stageProbabilitySchema.parse({ id: ID, probability: "" }).probability,
    ).toBeNull();
  });
  it("απορρίπτει πάνω από 100 και μη αριθμούς", () => {
    expect(
      stageProbabilitySchema.safeParse({ id: ID, probability: "120" }).success,
    ).toBe(false);
    expect(
      stageProbabilitySchema.safeParse({ id: ID, probability: "x" }).success,
    ).toBe(false);
  });
});
