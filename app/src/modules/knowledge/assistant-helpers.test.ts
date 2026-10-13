import { describe, expect, it } from "vitest";

import {
  askedText,
  listHref,
  pageCount,
  parseAudienceTab,
  parseDone,
  parsePage,
  parseUnansweredTab,
  whoText,
} from "./assistant-helpers";

describe("assistant helpers", () => {
  it("should say «ρωτήθηκε» with the right Greek number", () => {
    expect(askedText(1)).toBe("ρωτήθηκε 1 φορά");
    expect(askedText(2)).toBe("ρωτήθηκε 2 φορές");
  });

  it("should accept only known tabs and fall back safely", () => {
    expect(parseAudienceTab("client")).toBe("client");
    expect(parseAudienceTab("all")).toBeNull();
    expect(parseAudienceTab(undefined)).toBeNull();
    expect(parseUnansweredTab("ignored")).toBe("ignored");
    expect(parseUnansweredTab("x")).toBe("open");
  });

  it("should accept only known done codes", () => {
    expect(parseDone("covered_not_public")).toBe("covered_not_public");
    expect(parseDone("<script>")).toBeNull();
  });

  it("should parse the page as a positive integer", () => {
    expect(parsePage("3")).toBe(3);
    expect(parsePage("0")).toBe(1);
    expect(parsePage("-2")).toBe(1);
    expect(parsePage("abc")).toBe(1);
    expect(parsePage(undefined)).toBe(1);
  });

  it("should count pages, at least one", () => {
    expect(pageCount(0, 50)).toBe(1);
    expect(pageCount(50, 50)).toBe(1);
    expect(pageCount(51, 50)).toBe(2);
  });

  it("should build a list address without empty values", () => {
    expect(listHref("/app/x", { tab: null, page: 2 })).toBe("/app/x?page=2");
    expect(listHref("/app/x", { tab: null })).toBe("/app/x");
  });

  it("should say who asked", () => {
    expect(whoText("public", null, null)).toBe("Επισκέπτης");
    expect(whoText("client", "Κώστας", "Πελάτης Α")).toBe("Κώστας (Πελάτης Α)");
    expect(whoText("team", null, null)).toBe("Χρήστης που δεν υπάρχει πια");
  });
});
