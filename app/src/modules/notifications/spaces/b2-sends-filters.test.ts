import { describe, expect, it } from "vitest";

import {
  clientSendsGroups,
  clientSendsHref,
  parseClientSendsFilter,
} from "./b2-sends-filters";

const ID = "11111111-1111-4111-8111-111111111111";

describe("parseClientSendsFilter", () => {
  it("διαβάζει Κατάσταση και Κανάλι", () => {
    expect(
      parseClientSendsFilter({ state: "failed", channel: "email" }),
    ).toEqual({
      state: "failed",
      channel: "email",
    });
  });
  it("αγνοεί άγνωστες τιμές", () => {
    expect(
      parseClientSendsFilter({ state: "scheduled", channel: "sms" }),
    ).toEqual({
      state: "all",
      channel: null,
    });
  });
});

describe("clientSendsHref", () => {
  it("μένει στην καρτέλα «Τι στάλθηκε»", () => {
    expect(clientSendsHref(ID, { state: "failed", channel: "email" })).toBe(
      `/app/clients/${ID}?tab=dispatches&state=failed&channel=email`,
    );
    expect(clientSendsHref(ID, { state: "all", channel: null })).toBe(
      `/app/clients/${ID}?tab=dispatches`,
    );
  });
});

describe("clientSendsGroups", () => {
  it("Κατάσταση και Κανάλι, χωρίς Πελάτη", () => {
    const { filters } = clientSendsGroups(ID, { state: "sent", channel: null });
    expect(filters.map((group) => group.label)).toEqual([
      "Κατάσταση",
      "Κανάλι",
    ]);
    expect(filters[0]?.options.find((o) => o.isCurrent)?.label).toBe(
      "Στάλθηκαν",
    );
    expect(filters[1]?.all?.isCurrent).toBe(true);
  });
});
