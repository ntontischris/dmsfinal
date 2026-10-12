import { describe, expect, it } from "vitest";

import { isInProgress, plusDays } from "./in-progress";

const row = (overrides: Partial<Parameters<typeof isInProgress>[0]> = {}) => ({
  state: "proposal" as const,
  path: "sent" as const,
  validUntil: "2026-03-20",
  linksOpened: 0,
  ...overrides,
});

describe("plusDays", () => {
  it("should add days across a month end", () => {
    expect(plusDays("2026-02-27", 7)).toBe("2026-03-06");
  });

  it("should keep the day when adding zero", () => {
    expect(plusDays("2026-03-03", 0)).toBe("2026-03-03");
  });
});

describe("isInProgress", () => {
  const today = "2026-03-03";

  it("should include a sent proposal that expires within 7 days", () => {
    expect(isInProgress(row({ validUntil: "2026-03-10" }), today)).toBe(true);
  });

  it("should exclude a sent proposal that expires later and was not opened", () => {
    expect(isInProgress(row({ validUntil: "2026-03-11" }), today)).toBe(false);
  });

  it("should include a later proposal that the client opened", () => {
    expect(isInProgress(row({ linksOpened: 1 }), today)).toBe(true);
  });

  it("should exclude drafts and expired proposals", () => {
    expect(isInProgress(row({ path: "draft", validUntil: "2026-03-04" }), today)).toBe(false);
    expect(isInProgress(row({ path: "expired", linksOpened: 1 }), today)).toBe(false);
  });

  it("should exclude signed agreements", () => {
    expect(isInProgress(row({ state: "signed", validUntil: "2026-03-04" }), today)).toBe(false);
  });
});
