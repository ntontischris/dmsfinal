import { describe, expect, it, test } from "vitest";

import { historyWhen, m2Href, packButtonLabel, packMonthLabel } from "./m2-model";

// Από το prototype (`screens/m2-model.test.ts`).
test("το κουμπί του πακέτου λέει τον μήνα στη γενική", () => {
  expect(packButtonLabel("2026-08")).toBe("Λήψη πακέτου Αυγούστου 2026");
  expect(packButtonLabel("2026-05")).toBe("Λήψη πακέτου Μαΐου 2026");
  expect(packButtonLabel("2026-01")).toBe("Λήψη πακέτου Ιανουαρίου 2026");
});

describe("M2 νέα εμφάνιση", () => {
  it("should mark only the current month as partial", () => {
    expect(packMonthLabel("2026-11", "2026-11")).toBe("Νοέμβριος 2026 (ως σήμερα)");
    expect(packMonthLabel("2026-10", "2026-11")).toBe("Οκτώβριος 2026");
  });

  it("should split the history moment into Athens date and time", () => {
    expect(historyWhen("2026-09-02T07:14:00Z")).toEqual({ date: "02/09/2026", time: "10:14" });
  });

  it("should keep the chosen month next to the other export choices", () => {
    expect(m2Href({ dataset: "receipts", format: "csv" }, { month: "2026-10" })).toBe(
      "/app/reports/export?dataset=receipts&format=csv&month=2026-10",
    );
    expect(m2Href({}, { month: "2026-10" })).toBe("/app/reports/export?month=2026-10");
  });
});
