import { describe, expect, it } from "vitest";

import { hasActualHours, parseActualHours } from "./actual-hours";

describe("parseActualHours", () => {
  it("should keep the averages and counts the database returns", () => {
    expect(
      parseActualHours({
        shoot: 6.5,
        shootCount: 4,
        edit: "10.7",
        editCount: 3,
      }),
    ).toEqual({ shoot: 6.5, shootCount: 4, edit: 10.7, editCount: 3 });
  });

  it("should keep null as no measurement instead of zero hours", () => {
    const actual = parseActualHours({
      shoot: null,
      shootCount: 0,
      edit: null,
      editCount: 0,
    });
    expect(actual.shoot).toBeNull();
    expect(actual.edit).toBeNull();
    expect(hasActualHours(actual)).toBe(false);
  });

  it("should count as data when only one kind of hours is confirmed", () => {
    expect(
      hasActualHours({ shoot: 5, shootCount: 1, edit: null, editCount: 0 }),
    ).toBe(true);
  });

  it("should reject a malformed answer", () => {
    expect(() => parseActualHours({ shoot: 1 })).toThrow();
  });
});
