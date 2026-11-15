import { describe, expect, it } from "vitest";

import { parseTodayKpis, type TodayKpis } from "../view-schema";
import { kpiStatsOf, riskRowsOf } from "./a1-kpis";

const kpisOf = (overrides: Partial<TodayKpis> = {}): TodayKpis => ({
  month: "2025-06",
  turnover: 4000,
  pipeline: { weighted: 1000, total: 3000, open: 2 },
  activeProductions: 5,
  margin: { margin: 0.25, months: 5 },
  risks: [],
  ...overrides,
});

describe("kpiStatsOf", () => {
  it("τα τέσσερα πλακίδια με τη σειρά τους", () => {
    expect(kpiStatsOf(kpisOf()).map((s) => [s.label, s.value])).toEqual([
      ["Τζίρος μήνα", "4.000 €"],
      ["Αξία pipeline", "1.000 €"],
      ["Ενεργές Παραγωγές", "5"],
      ["Περιθώριο φέτος", "25%"],
    ]);
  });

  it("η Αξία pipeline λέει από πόσο και πόσες ανοιχτές", () => {
    expect(kpiStatsOf(kpisOf())[1]?.hint).toBe(
      "σταθμισμένη · από 3.000 € · 2 ανοιχτές",
    );
  });

  it("δείκτης χωρίς Δικαίωμα (null) δεν φαίνεται", () => {
    const stats = kpiStatsOf(
      kpisOf({ turnover: null, margin: null, activeProductions: null }),
    );
    expect(stats.map((s) => s.label)).toEqual(["Αξία pipeline"]);
    expect(
      kpiStatsOf(
        kpisOf({
          turnover: null,
          pipeline: null,
          activeProductions: null,
          margin: null,
        }),
      ),
    ).toEqual([]);
  });

  it("χωρίς «Βλέπει ποσά» το pipeline δείχνει μόνο τις ανοιχτές", () => {
    const [stat] = kpiStatsOf(
      kpisOf({
        turnover: null,
        pipeline: { weighted: null, total: null, open: 1 },
        activeProductions: null,
        margin: null,
      }),
    );
    expect(stat).toMatchObject({ label: "Ανοιχτές Ευκαιρίες", value: "1" });
  });

  it("αρνητικό Περιθώριο θέλει προσοχή· χωρίς μήνες με Έξοδα παύλα", () => {
    expect(
      kpiStatsOf(kpisOf({ margin: { margin: -0.1, months: 1 } }))[3],
    ).toMatchObject({
      tone: "attention",
      hint: "1 μήνας με Έξοδα",
    });
    expect(
      kpiStatsOf(kpisOf({ margin: { margin: null, months: 0 } }))[3],
    ).toMatchObject({
      value: "—",
      hint: "κανένας μήνας με Έξοδα",
    });
  });
});

describe("riskRowsOf", () => {
  it("μία φράση ανά κίνδυνο, με τον σύνδεσμό του", () => {
    expect(
      riskRowsOf([
        { code: "cost_overrun", count: 2, link: "/app/productions/costs" },
        { code: "hours_missing", count: 1, link: "/app/productions/costs" },
        {
          code: "expenses_missing",
          count: 1,
          link: "/app/finance/expenses?month=2025-05",
        },
        { code: "late_opportunities", count: 3, link: "/app/pipeline" },
      ]).map((r) => [r.title, r.href]),
    ).toEqual([
      ["2 Παραγωγές σε Υπέρβαση κόστους", "/app/productions/costs"],
      [
        "1 παραδομένη Παραγωγή χωρίς επιβεβαιωμένες ώρες",
        "/app/productions/costs",
      ],
      [
        "Λείπουν τα Έξοδα του προηγούμενου μήνα",
        "/app/finance/expenses?month=2025-05",
      ],
      ["3 Ευκαιρίες με Αναμενόμενο κλείσιμο που πέρασε", "/app/pipeline"],
    ]);
  });

  it("άγνωστος κωδικός δεν φαίνεται", () => {
    expect(riskRowsOf([{ code: "new_thing", count: 1, link: "/app" }])).toEqual(
      [],
    );
  });
});

describe("parseTodayKpis", () => {
  it("δέχεται το JSON της today_kpis με null δείκτες", () => {
    expect(
      parseTodayKpis({
        month: "2025-06",
        turnover: null,
        pipeline: null,
        activeProductions: 1,
        margin: null,
        risks: [],
      }).activeProductions,
    ).toBe(1);
  });

  it("απορρίπτει εξωτερικό σύνδεσμο κινδύνου", () => {
    expect(() =>
      parseTodayKpis({
        ...kpisOf(),
        risks: [
          { code: "cost_overrun", count: 1, link: "https://example.com" },
        ],
      }),
    ).toThrow();
  });
});
