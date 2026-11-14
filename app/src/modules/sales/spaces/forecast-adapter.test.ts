import { describe, expect, it } from "vitest";

import type { ForecastRow, PipelineValue } from "../types";
import {
  cardForecastText,
  closeText,
  pipelineStats,
  probabilityText,
  valueText,
} from "./forecast-adapter";

const row = (over: Partial<ForecastRow> = {}): ForecastRow => ({
  opportunityId: "o1",
  value: 6000,
  valueSource: "estimate",
  probability: 60,
  probabilitySource: "stage",
  weighted: 3600,
  expectedClose: "2026-11-30",
  isLate: false,
  ...over,
});

const value = (over: Partial<PipelineValue> = {}): PipelineValue => ({
  hasAmounts: true,
  open: 4,
  valued: 3,
  total: 10000,
  weighted: 5000,
  thisMonth: { count: 2, weighted: 1500 },
  late: 1,
  ...over,
});

describe("κείμενα πρόβλεψης", () => {
  it("Αξία και Πιθανότητα λένε από πού ήρθαν", () => {
    expect(valueText(row())).toContain("(εκτίμηση)");
    expect(valueText(row({ value: null }))).toBe("—");
    expect(probabilityText(row())).toBe("60% (του Σταδίου)");
  });
  it("κλείσιμο που πέρασε το λέει", () => {
    expect(closeText(row({ isLate: true }))).toContain("πέρασε");
    expect(closeText(row({ expectedClose: null }))).toBe("—");
  });
  it("η κάρτα δείχνει σταθμισμένη μόνο όταν υπάρχει", () => {
    expect(cardForecastText(row())).toMatch(/^60% · σταθμ\. .+ · κλείσιμο /);
    expect(cardForecastText(row({ weighted: null, expectedClose: null }))).toBe(
      "60%",
    );
    expect(cardForecastText(undefined)).toBeNull();
  });
});

describe("pipelineStats", () => {
  it("με «Βλέπει ποσά»: Αξία, σταθμισμένη και πλήθη", () => {
    const labels = pipelineStats(value()).map((s) => s.label);
    expect(labels).toEqual([
      "Αξία ανοιχτών",
      "Σταθμισμένη πρόβλεψη",
      "Ανοιχτές",
      "Κλείνουν αυτόν τον μήνα",
      "Πέρασε το κλείσιμο",
    ]);
  });
  it("χωρίς ποσά μένουν μόνο τα πλήθη· καθυστέρηση = προσοχή", () => {
    const stats = pipelineStats(
      value({ hasAmounts: false, total: null, weighted: null }),
    );
    expect(stats.map((s) => s.label)).not.toContain("Αξία ανοιχτών");
    expect(stats.find((s) => s.label === "Πέρασε το κλείσιμο")?.tone).toBe(
      "attention",
    );
  });
});
