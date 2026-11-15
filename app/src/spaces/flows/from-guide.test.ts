import { describe, expect, it } from "vitest";

import { fromJobOf, fromLabelOf, isAppHref, parseFrom } from "./from-guide";

const BACK = "/app/messages/c1?job=apanto-se-pelates&step=3";

describe("from-guide", () => {
  it("should accept only places inside the app", () => {
    expect(isAppHref(BACK)).toBe(true);
    expect(isAppHref("https://evil.example")).toBe(false);
    expect(isAppHref("//evil.example/app")).toBe(false);
  });

  it("should read back a stored place and refuse junk", () => {
    expect(parseFrom(JSON.stringify({ href: BACK, step: 2 }))).toEqual({
      href: BACK,
      step: 2,
    });
    expect(
      parseFrom(JSON.stringify({ href: "https://x", step: 2 })),
    ).toBeNull();
    expect(parseFrom("{")).toBeNull();
    expect(parseFrom(null)).toBeNull();
  });

  it("should name the guide we go back to", () => {
    expect(fromJobOf(BACK)).toBe("apanto-se-pelates");
    expect(fromLabelOf(BACK)).toMatch(/^Πίσω στο «.+»$/);
    expect(fromJobOf("/app/messages/c1")).toBeNull();
  });
});
