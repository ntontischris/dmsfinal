import { describe, expect, it } from "vitest";

import { parseCostRows } from "./view-schema";

const ROW = {
  productionId: "6f1c2f1e-3b0a-4d6e-9d52-0a1b2c3d4e5f",
  title: "Showreel",
  client: null,
  state: "open",
  estimate: { shootHours: 6, editHours: 14, directCost: 0, price: null, cost: null },
  actual: {
    shootHours: 6, shootConfirmed: false, editHours: 14, editConfirmed: false,
    directCost: 0, cost: null, suggestedShootHours: 0,
  },
  recorded: { shootHours: null, editHours: null, directCost: null },
  hourCost: null,
  hoursComplete: false,
  signals: { lowMargin: false, overrun: false },
};

describe("parseCostRows", () => {
  it("δέχεται γραμμή χωρίς Κόστος ώρας, με κενά κόστη", () => {
    const [row] = parseCostRows([ROW]);
    expect(row?.estimate.cost).toBeNull();
    expect(row?.actual.cost).toBeNull();
    expect(row?.hourCost).toBeNull();
  });
});
