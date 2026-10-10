import { describe, expect, it } from "vitest";

import { parseBlockedPrefill } from "./blocked-prefill";

const BLOCK_ID = "3f2c8f0e-6b1d-4d7a-9a57-2c1e0b9d4f11";

describe("parseBlockedPrefill", () => {
  it("should read the Athens day and time of the blocked start, and the hours", () => {
    expect(
      parseBlockedPrefill({
        fromBlocked: BLOCK_ID,
        startsAt: "2026-10-12T06:00:00+00:00",
        hours: "3",
      }),
    ).toEqual({ fromBlocked: BLOCK_ID, date: "2026-10-12", time: "09:00", hours: 3 });
  });

  it("should leave the hours to the default when they are missing", () => {
    expect(
      parseBlockedPrefill({ fromBlocked: BLOCK_ID, startsAt: "2026-10-12T06:00:00Z" }),
    ).toMatchObject({ hours: null });
  });

  it("should return nothing when the block id is not a uuid", () => {
    expect(parseBlockedPrefill({ fromBlocked: "abc", startsAt: "2026-10-12T06:00:00Z" })).toBeNull();
  });

  it("should return nothing when the hours are out of the filming range", () => {
    expect(
      parseBlockedPrefill({ fromBlocked: BLOCK_ID, startsAt: "2026-10-12T06:00:00Z", hours: "24" }),
    ).toBeNull();
  });
});
