import { describe, expect, it } from "vitest";

import type { CostMonth } from "@/modules/catalogue";

import type { MonthExpenses } from "../expenses-schema";
import {
  historyRowsOf,
  monthOfParam,
  monthTabsOf,
  paramOfMonth,
  seedOf,
} from "./i6-adapter";
import { toCategories, toDrafts } from "./i6-model";

const CURRENT = "2026-11-01";
const RENT = [
  {
    name: "Σταθερά",
    items: [{ name: "Ενοίκιο", lines: [{ label: "Γραφείο", amount: 1500 }] }],
  },
];

const view = (overrides: Partial<MonthExpenses> = {}): MonthExpenses => ({
  month: CURRENT,
  isClosed: false,
  canEdit: true,
  saved: null,
  previous: null,
  ...overrides,
});

const costMonth = (
  month: string,
  overrides: Partial<CostMonth> = {},
): CostMonth => ({
  month,
  expensesTotal: 2200,
  productiveHours: 220,
  hourCost: 10,
  isClosed: month < CURRENT,
  updatedAt: "2026-10-01T10:00:00Z",
  updatedByName: null,
  ...overrides,
});

describe("μήνας στη διεύθυνση", () => {
  it("δέχεται YYYY-MM και γυρίζει στον τρέχοντα για άκυρη τιμή", () => {
    expect(monthOfParam("2026-09", CURRENT)).toBe("2026-09-01");
    expect(monthOfParam("2026-13", CURRENT)).toBe(CURRENT);
    expect(monthOfParam(undefined, CURRENT)).toBe(CURRENT);
  });

  it("δεν γράφει τον τρέχοντα μήνα στη διεύθυνση", () => {
    expect(paramOfMonth(CURRENT, CURRENT)).toBeUndefined();
    expect(paramOfMonth("2026-12-01", CURRENT)).toBe("2026-12");
  });
});

describe("monthTabsOf", () => {
  it("τρεις παλιοί μήνες, ο τρέχων, ο επόμενος και ο επιλεγμένος, με σειρά", () => {
    const saved = [
      "2026-06-01",
      "2026-07-01",
      "2026-08-01",
      "2026-09-01",
      "2027-02-01",
    ];
    expect(monthTabsOf(saved, CURRENT, "2026-03-01")).toEqual([
      "2026-03-01",
      "2026-07-01",
      "2026-08-01",
      "2026-09-01",
      "2026-11-01",
      "2026-12-01",
      "2027-02-01",
    ]);
  });
});

describe("seedOf", () => {
  it("γραμμένος μήνας με ανάλυση: οι γραμμές του", () => {
    const seed = seedOf(
      view({
        saved: {
          expensesTotal: 1500,
          productiveHours: 150,
          hourCost: 10,
          categories: RENT,
        },
      }),
    );
    expect(seed).toMatchObject({
      source: "saved",
      productiveHours: 150,
      baseTotal: 0,
    });
    expect(seed?.categories).toEqual(RENT);
  });

  it("μήνας με ένα σύνολο: κρατά το σύνολο χωρίς γραμμές", () => {
    const seed = seedOf(
      view({
        saved: {
          expensesTotal: 900,
          productiveHours: 90,
          hourCost: 10,
          categories: null,
        },
      }),
    );
    expect(seed).toMatchObject({
      source: "total",
      baseTotal: 900,
      categories: [],
    });
  });

  it("νέος μήνας: αντίγραφο του προηγούμενου", () => {
    const seed = seedOf(
      view({
        previous: {
          month: "2026-10-01",
          productiveHours: 150,
          categories: RENT,
        },
      }),
    );
    expect(seed).toMatchObject({
      source: "copy",
      copiedFrom: "2026-10-01",
      productiveHours: 150,
    });
  });

  it("κλεισμένος μήνας που δεν γράφτηκε ποτέ: τίποτα", () => {
    expect(seedOf(view({ isClosed: true, canEdit: false }))).toBeNull();
  });
});

describe("toCategories", () => {
  it("γυρίζει ό,τι ήρθε, χωρίς τα id του επεξεργαστή", () => {
    expect(toCategories(toDrafts(RENT))).toEqual(RENT);
  });
});

describe("historyRowsOf", () => {
  it("από τον παλιότερο στον νεότερο, με την κατάσταση κάθε μήνα", () => {
    const rows = historyRowsOf(
      [costMonth("2026-12-01"), costMonth(CURRENT), costMonth("2026-10-01")],
      CURRENT,
    );
    expect(rows.map((r) => [r.month, r.statusLabel, r.isClosed])).toEqual([
      ["2026-10-01", "κλεισμένος", true],
      ["2026-11-01", "τρέχων", false],
      ["2026-12-01", "μελλοντικός", false],
    ]);
    expect(rows[0]?.label).toBe("Οκτώβριος 2026");
  });
});
