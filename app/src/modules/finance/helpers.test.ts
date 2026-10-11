import { describe, expect, it } from "vitest";

import {
  daysText,
  reasonText,
  reminderText,
  sortClientsByOldest,
  sortItemsByDate,
} from "./helpers";
import type { BillableClient, BillableItem } from "./view-schema";

function client(overrides: Partial<BillableClient>): BillableClient {
  return {
    clientId: "c",
    clientName: "Πελάτης",
    open: 0,
    count: 0,
    oldestDays: 0,
    beyond: 0,
    items: [],
    ...overrides,
  };
}

function item(overrides: Partial<BillableItem>): BillableItem {
  return {
    id: "b",
    billableOn: "2027-03-01",
    agreementId: "a",
    agreementTitle: "Συμφωνία",
    reason: "period",
    label: "Περίοδος",
    net: 100,
    open: 100,
    daysOpen: 0,
    reminders: [],
    ...overrides,
  };
}

describe("daysText", () => {
  it("should use the singular for exactly one day", () => {
    expect(daysText(1)).toBe("1 μέρα");
  });

  it("should use the plural for zero and for many days", () => {
    expect(daysText(0)).toBe("0 μέρες");
    expect(daysText(14)).toBe("14 μέρες");
  });
});

describe("reminderText", () => {
  it("should show the reminder day in short form", () => {
    expect(reminderText(7)).toBe("7 μ.");
    expect(reminderText(14)).toBe("14 μ.");
  });
});

describe("reasonText", () => {
  it("should translate a known reason and keep an unknown one as it is", () => {
    expect(reasonText("dissolution_fee")).toBe("Ρήτρα λύσης");
    expect(reasonText("something_new")).toBe("something_new");
  });
});

describe("sortClientsByOldest", () => {
  it("should put the client with the oldest open billable first", () => {
    const sorted = sortClientsByOldest([
      client({ clientName: "Νέος", oldestDays: 2 }),
      client({ clientName: "Παλιός", oldestDays: 30 }),
    ]);

    expect(sorted.map((c) => c.clientName)).toEqual(["Παλιός", "Νέος"]);
  });

  it("should order equally old clients by name and leave the input untouched", () => {
    const input = [
      client({ clientName: "Ζ", oldestDays: 5 }),
      client({ clientName: "Α", oldestDays: 5 }),
    ];

    expect(sortClientsByOldest(input).map((c) => c.clientName)).toEqual([
      "Α",
      "Ζ",
    ]);
    expect(input.map((c) => c.clientName)).toEqual(["Ζ", "Α"]);
  });
});

describe("sortItemsByDate", () => {
  it("should order lines by their billable date, oldest first", () => {
    const sorted = sortItemsByDate([
      item({ id: "b2", billableOn: "2027-04-01" }),
      item({ id: "b1", billableOn: "2027-03-01" }),
    ]);

    expect(sorted.map((i) => i.id)).toEqual(["b1", "b2"]);
  });
});
