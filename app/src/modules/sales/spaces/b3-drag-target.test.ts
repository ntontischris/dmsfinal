import { describe, expect, it } from "vitest";

import { nearestStage, resolveStage, type StageBox } from "./b3-drag-target";

const box = (id: string, left: number, bottom = 300): StageBox => ({
  id,
  left,
  right: left + 200,
  top: 0,
  bottom,
});
const columns = [box("new", 0, 2000), box("meet", 220, 150), box("offer", 440)];

describe("nearestStage", () => {
  it("should pick the column that contains the point", () => {
    expect(nearestStage(columns, 300, 100)).toBe("meet");
  });

  it("should pick a short column when the card is dropped below its end", () => {
    expect(nearestStage(columns, 300, 900)).toBe("meet");
  });

  it("should pick the nearest column when dropped in the gap between two", () => {
    expect(nearestStage(columns, 435, 100)).toBe("offer");
  });

  it("should return null when there are no columns", () => {
    expect(nearestStage([], 10, 10)).toBeNull();
  });
});

describe("resolveStage", () => {
  it("should show the dropped stage while the server still has the old one", () => {
    expect(resolveStage("new", { base: "new", to: "meet" })).toBe("meet");
  });

  it("should follow the server once its stage changed", () => {
    expect(resolveStage("offer", { base: "new", to: "meet" })).toBe("offer");
  });

  it("should use the server stage without an override", () => {
    expect(resolveStage("new", undefined)).toBe("new");
  });
});
