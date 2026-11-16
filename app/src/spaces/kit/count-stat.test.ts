import { describe, expect, it } from "vitest";

import { countStat } from "./count-stat";

describe("countStat", () => {
  it("στο 0 μένει ήσυχη, πάνω από 0 ζητά προσοχή", () => {
    expect(countStat({ label: "Α" }, 0)).toEqual({
      label: "Α",
      value: "0",
      tone: undefined,
    });
    expect(countStat({ label: "Α" }, 2).tone).toBe("attention");
  });

  it("η δουλειά που δεν είναι πρόβλημα μένει ήσυχη και πάνω από 0", () => {
    expect(countStat({ label: "Α" }, 5, false).tone).toBeUndefined();
  });
});
