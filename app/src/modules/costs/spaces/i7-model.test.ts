import { describe, expect, it } from "vitest";

import type { ProfitRow } from "../expenses-schema";
import { firstMonthOf } from "./i7-adapter";
import {
  allRows,
  byClient,
  byMonth,
  marginText,
  totalMissing,
} from "./i7-model";

const row = (overrides: Partial<ProfitRow> = {}): ProfitRow => ({
  productionId: "p1",
  title: "Βίντεο Αθηνά",
  clientId: "c1",
  client: "Καφέ Αθηνά",
  month: "2026-03-01",
  isInternal: false,
  price: 1000,
  estimateCost: 200,
  actualCost: 250,
  hoursComplete: true,
  overrun: false,
  ...overrides,
});

const ROWS = allRows([
  row(),
  row({ productionId: "p2", price: 500, actualCost: 100, month: "2026-04-01" }),
  row({
    productionId: "p3",
    clientId: "c2",
    client: "Κίνηση",
    hoursComplete: false,
  }),
  row({
    productionId: "p4",
    clientId: null,
    client: null,
    isInternal: true,
    price: null,
    actualCost: 50,
  }),
]);

describe("rowOf", () => {
  it("περιθώριο = τιμή − πραγματικό κόστος· χωρίς ώρες σημαίνεται", () => {
    expect(ROWS[0]).toMatchObject({
      margin: 750,
      missingHours: false,
      clientName: "Καφέ Αθηνά",
    });
    expect(ROWS[2]?.missingHours).toBe(true);
  });

  it("εσωτερική: χωρίς τιμή, άρα χωρίς περιθώριο", () => {
    expect(ROWS[3]).toMatchObject({
      internal: true,
      margin: null,
      clientName: "Εσωτερική",
    });
  });
});

describe("byClient", () => {
  it("μετρά μόνο Παραγωγές με ώρες, οι υπόλοιπες χωριστά, χωρίς την εσωτερική", () => {
    const groups = byClient(ROWS);
    expect(
      groups.map((g) => [g.key, g.counted, g.missing, g.price, g.cost]),
    ).toEqual([
      ["c1", 2, 0, 1500, 350],
      ["c2", 0, 1, 0, 0],
    ]);
    expect(totalMissing(groups)).toBe(1);
  });
});

describe("byMonth", () => {
  it("ανά μήνα, με την εσωτερική δουλειά σε δική της γραμμή", () => {
    expect(
      byMonth(ROWS).map((g) => [g.key, g.counted, g.cost, g.isInternal]),
    ).toEqual([
      ["2026-03-01", 1, 250, false],
      ["2026-03-01-int", 1, 50, true],
      ["2026-04-01", 1, 100, false],
    ]);
  });
});

describe("marginText και διάστημα", () => {
  it("περιθώριο ως ποσοστό της τιμής· χωρίς τιμή «—»", () => {
    expect(marginText(0, 10)).toBe("—");
    expect(marginText(1000, 250)).toMatch(/75/);
  });

  it("δώδεκα μήνες ως τον τρέχοντα, και πέρα από αλλαγή χρονιάς", () => {
    expect(firstMonthOf("2026-11-01", 12)).toBe("2025-12-01");
    expect(firstMonthOf("2026-01-01", 1)).toBe("2026-01-01");
    expect(firstMonthOf("2026-01-01", 2)).toBe("2025-12-01");
  });
});
