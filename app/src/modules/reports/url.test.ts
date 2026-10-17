import { describe, expect, it } from "vitest";

import {
  DEFAULT_PERIOD,
  clientHref,
  ledgerHref,
  parseClient,
  parsePeriod,
  parseReportId,
  reportHref,
} from "./url";

const CLIENT = "00000000-0000-0000-0000-0000000000c1";

describe("parsePeriod", () => {
  it("should accept the five fixed periods", () => {
    expect(parsePeriod("last-month")).toBe("last-month");
    expect(parsePeriod("this-quarter")).toBe("this-quarter");
  });

  it("should fall back to this year for a missing or unknown period", () => {
    expect(parsePeriod(undefined)).toBe("this-year");
    expect(parsePeriod("2026-01-01..2026-02-01")).toBe(DEFAULT_PERIOD);
  });

  it("should read the first value when the period repeats", () => {
    expect(parsePeriod(["last-year", "this-month"])).toBe("last-year");
  });
});

describe("parseClient", () => {
  it("should keep a valid client id", () => {
    expect(parseClient(CLIENT)).toBe(CLIENT);
  });

  it("should drop anything that is not an id", () => {
    expect(parseClient("Πελάτης Α")).toBeUndefined();
    expect(parseClient(undefined)).toBeUndefined();
  });
});

describe("parseReportId", () => {
  it("should treat an empty report as the catalogue", () => {
    expect(parseReportId("  ")).toBeUndefined();
    expect(parseReportId("turnover")).toBe("turnover");
  });
});

describe("reportHref", () => {
  it("should point to the catalogue without filters", () => {
    expect(reportHref({})).toBe("/app/reports");
  });

  it("should leave the default period out of the link", () => {
    expect(reportHref({ report: "turnover", period: "this-year" })).toBe(
      "/app/reports?report=turnover",
    );
  });

  it("should keep report, period and client so a bookmark reopens the same view", () => {
    expect(
      reportHref({ report: "turnover", period: "last-month", client: CLIENT }),
    ).toBe(`/app/reports?report=turnover&period=last-month&client=${CLIENT}`);
  });
});

describe("row links", () => {
  it("should open the client page and the client ledger", () => {
    expect(clientHref(CLIENT)).toBe(`/app/clients/${CLIENT}`);
    expect(ledgerHref(CLIENT)).toBe(`/app/finance/ledger?client=${CLIENT}`);
  });
});
