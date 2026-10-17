import { describe, expect, it } from "vitest";

import {
  analyticsIdsSchema,
  subscriptionInputSchema,
  toSubscriptionRow,
} from "./schemas";

describe("analyticsIdsSchema", () => {
  it("δέχεται G-… (με κεφαλαία) και αριθμητικό Pixel, και τα κενά", () => {
    expect(
      analyticsIdsSchema.parse({
        ga4: " g-ab12cd34ef ",
        pixel: " 123456789012345 ",
      }),
    ).toEqual({
      ga4: "G-AB12CD34EF",
      pixel: "123456789012345",
    });
    expect(analyticsIdsSchema.parse({ ga4: "", pixel: "" })).toEqual({
      ga4: "",
      pixel: "",
    });
  });

  it("απορρίπτει άλλη μορφή GA (UA-…, χωρίς G-) και Pixel με γράμματα", () => {
    expect(
      analyticsIdsSchema.safeParse({ ga4: "UA-12345-1", pixel: "" }).success,
    ).toBe(false);
    expect(
      analyticsIdsSchema.safeParse({ ga4: "AB12CD34EF", pixel: "" }).success,
    ).toBe(false);
    expect(
      analyticsIdsSchema.safeParse({ ga4: "", pixel: "12ab56789" }).success,
    ).toBe(false);
    expect(
      analyticsIdsSchema.safeParse({ ga4: "", pixel: "12345" }).success,
    ).toBe(false);
  });
});

const valid = {
  provider: " Vercel ",
  covers: "Φιλοξενία",
  plan: "Pro",
  monthlyCost: "19,90",
  currency: "usd",
  renewsOn: "2026-11-01",
  account: "του developer",
  paidBy: "η εταιρεία",
  link: "https://vercel.com",
};

describe("subscriptionInputSchema", () => {
  it("καθαρίζει: κόμμα σε τελεία, νόμισμα σε κεφαλαία, κενή ανανέωση = null", () => {
    const parsed = subscriptionInputSchema.parse(valid);
    expect(parsed).toMatchObject({
      provider: "Vercel",
      monthlyCost: 19.9,
      currency: "USD",
      renewsOn: "2026-11-01",
    });
    expect(
      subscriptionInputSchema.parse({ ...valid, renewsOn: "" }).renewsOn,
    ).toBeNull();
    expect(toSubscriptionRow(parsed)).toMatchObject({
      monthly_cost: 19.9,
      renews_on: "2026-11-01",
      paid_by: "η εταιρεία",
    });
  });

  it("απορρίπτει: χωρίς πάροχο, ποσό που δεν είναι ποσό, νόμισμα εκτός ISO, σύνδεσμο χωρίς https", () => {
    expect(
      subscriptionInputSchema.safeParse({ ...valid, provider: "  " }).success,
    ).toBe(false);
    expect(
      subscriptionInputSchema.safeParse({ ...valid, monthlyCost: "-5" })
        .success,
    ).toBe(false);
    expect(
      subscriptionInputSchema.safeParse({ ...valid, monthlyCost: "είκοσι" })
        .success,
    ).toBe(false);
    expect(
      subscriptionInputSchema.safeParse({ ...valid, monthlyCost: "1,234" })
        .success,
    ).toBe(false);
    expect(
      subscriptionInputSchema.safeParse({ ...valid, currency: "€" }).success,
    ).toBe(false);
    expect(
      subscriptionInputSchema.safeParse({ ...valid, currency: "EURO" }).success,
    ).toBe(false);
    expect(
      subscriptionInputSchema.safeParse({ ...valid, link: "http://vercel.com" })
        .success,
    ).toBe(false);
  });
});
