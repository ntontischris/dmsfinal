import { readFileSync } from "node:fs";

import { describe, expect, it } from "vitest";

import type { ReportDefinition, ReportExportSpec } from "../catalog/types";
import { FINANCE_REPORTS } from "../catalog/finance";
import { SALES_REPORTS } from "../catalog/sales";
import { DATASETS, DATASET_CODES } from "./datasets";
import { fileBase, fileName, periodPart, uniqueName } from "./file-name";
import { historyWhat } from "./history";
import {
  exportableReport,
  reportArgs,
  reportFileName,
  reportSheet,
} from "./report-export";
import {
  exportHref,
  packMonths,
  parseFormat,
  parseMonth,
  pickPackMonth,
} from "./url";
import type { ExportHistoryItem } from "./view-schema";

const SPEC: ReportExportSpec = {
  rpc: "report_example",
  params: ["period", "seller"],
  rowsKey: "rows",
  columns: [
    { key: "name", header: "Όνομα", type: "text" },
    { key: "value", header: "Αξία", type: "money" },
  ],
  totals: { key: "totals", label: "Σύνολο" },
};

describe("reportArgs", () => {
  it("should pass only the filters the report takes, and only those with a value", () => {
    expect(
      reportArgs(SPEC, { period: "this-year", clientId: "c", sellerId: "s" }),
    ).toEqual({
      p_period: "this-year",
      p_seller: "s",
    });
    expect(reportArgs(SPEC, { period: "last-year" })).toEqual({
      p_period: "last-year",
    });
    expect(
      reportArgs({ ...SPEC, params: [] }, { period: "this-year" }),
    ).toEqual({});
  });
});

describe("reportSheet", () => {
  it("should export the report's own rows and totals as shown", () => {
    const sheet = reportSheet("Παράδειγμα", SPEC, {
      rows: [{ name: "Α", value: 10 }],
      totals: { value: 10 },
    });
    expect(sheet.name).toBe("Παράδειγμα");
    expect(sheet.rows).toEqual([
      ["Α", 10],
      ["Σύνολο", 10],
    ]);
  });

  it("should give an empty sheet when the JSON has no rows", () => {
    expect(reportSheet("Χ", { ...SPEC, totals: undefined }, null).rows).toEqual(
      [],
    );
  });
});

describe("reportFileName", () => {
  it("should name the file after the report, client and period", () => {
    const data = {
      period: { label: "Φέτος", from: "2026-01-01", to: "2026-12-31" },
      client: { name: "Πελάτης/Α" },
    };
    expect(reportFileName("Τζίρος ανά μήνα", data, "xlsx")).toBe(
      "Τζίρος ανά μήνα Πελάτης Α 2026-01-01 – 2026-12-31.xlsx",
    );
    expect(reportFileName("Οφειλές", { today: "2026-10-17" }, "csv")).toBe(
      "Οφειλές 2026-10-17.csv",
    );
  });
});

describe("exportableReport", () => {
  it("should find only reports with an export contract", () => {
    const plain = {
      ...FINANCE_REPORTS[0],
      id: "plain",
      exportSpec: undefined,
    } satisfies ReportDefinition;
    expect(exportableReport([plain], "plain")).toBeUndefined();
    expect(exportableReport(FINANCE_REPORTS, "turnover")?.exportSpec.rpc).toBe(
      "report_turnover_monthly",
    );
  });

  it("should give every report an export over its own report_* RPC", () => {
    for (const report of [...FINANCE_REPORTS, ...SALES_REPORTS]) {
      expect(report.exportSpec?.rpc).toMatch(/^report_[a-z_]+$/);
      expect(report.exportSpec?.rowsKey).toMatch(/^[A-Za-z]+$/);
    }
  });

  it("should list every report export in the database allowlist", () => {
    const migration = readFileSync(
      "supabase/migrations/20261017160000_reports_export.sql",
      "utf8",
    );
    for (const { id, exportSpec } of [...FINANCE_REPORTS, ...SALES_REPORTS])
      expect(migration).toContain(
        `('${id}', '${exportSpec?.rpc}', '${exportSpec?.rowsKey}')`,
      );
  });
});

describe("datasets", () => {
  it("should define every dataset the database knows, in its order", () => {
    expect(DATASETS.map((d) => d.code)).toEqual([...DATASET_CODES]);
    for (const dataset of DATASETS)
      expect(dataset.columns.length).toBeGreaterThan(0);
  });
});

describe("file names", () => {
  it("should drop characters file systems refuse and empty parts", () => {
    expect(fileBase(["Α/Β:Γ", null, " ", "2026"])).toBe("Α Β Γ 2026");
    expect(fileBase([])).toBe("Εξαγωγή");
    expect(fileName(["Πελάτες"], "csv")).toBe("Πελάτες.csv");
    expect(periodPart({ from: "2026-01-01", to: "2026-03-31" })).toBe(
      "2026-01-01 – 2026-03-31",
    );
    expect(periodPart(null)).toBeNull();
  });

  it("should make names unique without caring about case", () => {
    expect(uniqueName("A-1", "pdf", new Set(["a-1.pdf", "A-1 (2).pdf"]))).toBe(
      "A-1 (3).pdf",
    );
  });
});

describe("export url", () => {
  it("should keep the choices short in the address", () => {
    expect(exportHref({})).toBe("/app/reports/export");
    expect(
      exportHref({ dataset: "clients", period: "this-year", format: "xlsx" }),
    ).toBe("/app/reports/export?dataset=clients");
    expect(
      exportHref({ period: "last-month", format: "csv", month: "2026-09" }),
    ).toBe("/app/reports/export?period=last-month&format=csv&month=2026-09");
  });

  it("should read the format and month safely", () => {
    expect(parseFormat("csv")).toBe("csv");
    expect(parseFormat(["xlsx"])).toBe("xlsx");
    expect(parseFormat("pdf")).toBe("xlsx");
    expect(parseMonth("2026-09")).toBe("2026-09");
    expect(parseMonth("2026-13")).toBeUndefined();
  });

  it("should offer the last six months and default to the last closed one", () => {
    const months = packMonths("2026-01-17");
    expect(months).toEqual([
      "2026-01",
      "2025-12",
      "2025-11",
      "2025-10",
      "2025-09",
      "2025-08",
    ]);
    expect(pickPackMonth(months, undefined)).toBe("2025-12");
    expect(pickPackMonth(months, "2025-09")).toBe("2025-09");
    expect(pickPackMonth(months, "2024-01")).toBe("2025-12");
  });
});

describe("historyWhat", () => {
  const item = (overrides: Partial<ExportHistoryItem>): ExportHistoryItem => ({
    at: "2026-09-02T07:14:00Z",
    actorName: "Ελένη",
    isMine: true,
    kind: "dataset",
    subject: "invoices",
    filters: { period: "this-month", from: "2026-09-01", to: "2026-09-30" },
    rows: 9,
    format: "xlsx",
    ...overrides,
  });

  it("should describe each kind of export", () => {
    const title = (id: string) =>
      id === "turnover" ? "Τζίρος και Εισπράξεις ανά μήνα" : undefined;
    expect(historyWhat(item({}), title)).toBe(
      "Τιμολόγια · 01/09/2026 – 30/09/2026 · Excel",
    );
    expect(
      historyWhat(
        item({ kind: "report", subject: "turnover", format: "csv" }),
        title,
      ),
    ).toBe(
      "Αναφορά «Τζίρος και Εισπράξεις ανά μήνα» · 01/09/2026 – 30/09/2026 · CSV",
    );
    expect(
      historyWhat(
        item({
          kind: "accountant_pack",
          subject: "accountant-pack",
          filters: { month: "2026-08" },
          format: "zip",
        }),
        title,
      ),
    ).toBe("Πακέτο λογιστή · Αύγουστος 2026 · .zip");
    expect(historyWhat(item({ subject: "clients", filters: {} }), title)).toBe(
      "Πελάτες · Excel",
    );
  });
});
