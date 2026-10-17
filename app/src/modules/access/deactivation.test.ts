import { describe, expect, it } from "vitest";

import { assignmentGroups, BLOCK_TEXT, DEACTIVATION_BLOCKS, deactivationPreviewSchema, type DeactivationItem } from "./deactivation";

const item = (kind: DeactivationItem["kind"], label: string, detail = ""): DeactivationItem => ({
  kind,
  id: `${kind}-${label}`,
  label,
  detail,
});

describe("assignmentGroups", () => {
  it("should return no groups when nothing is assigned", () => {
    expect(assignmentGroups([])).toEqual([]);
  });

  it("should group by kind in catalogue order with singular and plural nouns", () => {
    const groups = assignmentGroups([
      item("crew", "Εγκαίνια", "24/10/2026 10:00"),
      item("client", "Κυψέλη Καφέ"),
      item("client", "Ταβέρνα Αρμύρα"),
      item("production", "Σεπτέμβριος", "Κυψέλη Καφέ"),
    ]);
    expect(groups.map((g) => g.kind)).toEqual(["client", "production", "crew"]);
    expect(groups[0]?.title).toBe("2 Πελάτες → στην ουρά «Χωρίς υπεύθυνο»");
    expect(groups[1]?.title).toBe("1 Παραγωγή → χωρίς Υπεύθυνο");
    expect(groups[2]?.names).toEqual(["Εγκαίνια · 24/10/2026 10:00"]);
  });
});

describe("deactivationPreviewSchema", () => {
  it("should accept a blocked preview and reject an unknown reason", () => {
    expect(deactivationPreviewSchema.safeParse({ isActive: true, block: "self", items: [] }).success).toBe(true);
    expect(deactivationPreviewSchema.safeParse({ isActive: true, block: "nope", items: [] }).success).toBe(false);
  });

  it("should have a message for every reason the database returns", () => {
    for (const block of DEACTIVATION_BLOCKS) expect(BLOCK_TEXT[block]).not.toBe("");
  });
});
