import { describe, expect, it } from "vitest";

import type { CostRow } from "../types";
import {
  basisOf,
  defaultIdOf,
  estimateOf,
  internalEstimateOf,
  pickerGroupsOf,
  savedValueOf,
} from "./g3-adapter";

const row = (overrides: Partial<CostRow> = {}): CostRow => ({
  productionId: "p-1",
  title: "Κυψέλη Καφέ — Μάρτιος",
  client: "Κυψέλη Καφέ",
  state: "open",
  estimate: {
    shootHours: 6,
    editHours: 10,
    directCost: 50,
    price: 1200,
    cost: 690,
  },
  actual: {
    shootHours: 6,
    shootConfirmed: false,
    editHours: 10,
    editConfirmed: false,
    directCost: 50,
    cost: 770,
    suggestedShootHours: 8,
  },
  recorded: { shootHours: null, editHours: null, directCost: null },
  hourCost: 45,
  hoursComplete: false,
  signals: { lowMargin: false, overrun: false },
  ...overrides,
});

const settings = { overrunPercent: 20, multiplierMin: 1.3 };

describe("pickerGroupsOf", () => {
  it("should keep the three groups in order and link each production to G3", () => {
    const groups = pickerGroupsOf({
      needs_hours: [],
      overrun: [row({ productionId: "p-2", client: null, title: "Showreel" })],
      rest: [row()],
    });
    expect(groups.map((g) => g.title)).toEqual([
      "Θέλουν Πραγματικές ώρες",
      "Υπέρβαση κόστους",
      "Οι υπόλοιπες",
    ]);
    expect(groups[1]?.items[0]).toEqual({
      id: "p-2",
      title: "Showreel",
      href: "/app/productions/costs?production=p-2",
      isInternal: true,
    });
    expect(defaultIdOf(groups)).toBe("p-2");
  });

  it("should have no default when there is no production", () => {
    expect(
      defaultIdOf(pickerGroupsOf({ needs_hours: [], overrun: [], rest: [] })),
    ).toBeUndefined();
  });
});

describe("estimateOf", () => {
  it("should derive the estimate's hour cost from its cost", () => {
    expect(estimateOf(row())).toEqual({
      hours: { shoot: 6, edit: 10 },
      hourCost: 40,
      directCost: 50,
      cost: 690,
    });
  });

  it("should treat an internal production with nothing estimated as having no estimate", () => {
    const internal = row({
      client: null,
      estimate: {
        shootHours: 0,
        editHours: 0,
        directCost: 0,
        price: null,
        cost: 0,
      },
    });
    expect(estimateOf(internal)).toBeNull();
    expect(internalEstimateOf(internal)).toBeNull();
  });

  it("should leave the estimate's hour cost empty without hours or cost", () => {
    const noCost = row({
      estimate: {
        shootHours: 4,
        editHours: 2,
        directCost: 0,
        price: 500,
        cost: null,
      },
    });
    expect(estimateOf(noCost)?.hourCost).toBeNull();
  });
});

describe("basisOf / savedValueOf", () => {
  it("should hide the price of an internal production", () => {
    expect(basisOf(row({ client: null }), settings).price).toBeNull();
    expect(basisOf(row(), settings)).toMatchObject({
      price: 1200,
      hourCost: 45,
      overrunPercent: 20,
      multiplierMin: 1.3,
    });
  });

  it("should take the written hours, not the estimate fallback", () => {
    expect(savedValueOf(row())).toEqual({
      shoot: null,
      shootConfirmed: false,
      edit: null,
      editConfirmed: false,
      directCost: null,
    });
    expect(
      savedValueOf(
        row({
          recorded: { shootHours: 7, editHours: 9, directCost: 20 },
          actual: {
            ...row().actual,
            shootConfirmed: true,
            editConfirmed: true,
          },
        }),
      ),
    ).toEqual({
      shoot: 7,
      shootConfirmed: true,
      edit: 9,
      editConfirmed: true,
      directCost: 20,
    });
  });
});
