import { describe, expect, it } from "vitest";

import type { B1Row } from "./b1-adapter";
import {
  applyB1Filters,
  b1FilterGroups,
  b1Href,
  parseB1Filters,
  type B1Filters,
} from "./b1-filters";
import type { MonthGlance } from "./b1-month";

const NONE: B1Filters = { status: null, isNoShoot: false, isMonthly: false };

const month = (hasNoShoot: boolean): MonthGlance =>
  ({ hasNoShoot, meters: [], next: null, text: "" }) as unknown as MonthGlance;

const row = (
  id: string,
  status: string | null,
  glance: MonthGlance | null,
): B1Row => ({ id, name: id, status, month: glance }) as unknown as B1Row;

const ROWS = [
  row("a", "Ενεργός", month(true)),
  row("b", "Ενεργός", month(false)),
  row("c", "Υποψήφιος", null),
  row("d", null, null),
];

describe("parseB1Filters", () => {
  it("διαβάζει Κατάσταση και διακόπτες από τη διεύθυνση", () => {
    expect(
      parseB1Filters({ status: "active", noshoot: "1", monthly: "1" }),
    ).toEqual({
      status: "active",
      isNoShoot: true,
      isMonthly: true,
    });
  });
  it("αγνοεί άγνωστη Κατάσταση", () => {
    expect(parseB1Filters({ status: "x" })).toEqual(NONE);
  });
});

describe("b1Href", () => {
  it("κρατά την αναζήτηση μαζί με τα φίλτρα", () => {
    expect(
      b1Href("Κυψέλη", { ...NONE, status: "inactive", isMonthly: true }),
    ).toBe(
      "/app/clients?q=%CE%9A%CF%85%CF%88%CE%AD%CE%BB%CE%B7&status=inactive&monthly=1",
    );
  });
  it("χωρίς τίποτα: η καθαρή λίστα", () => {
    expect(b1Href("", NONE)).toBe("/app/clients");
  });
});

describe("applyB1Filters", () => {
  it("στενεύει ανά Κατάσταση και διακόπτες", () => {
    expect(
      applyB1Filters(ROWS, { ...NONE, status: "active" }).map((r) => r.id),
    ).toEqual(["a", "b"]);
    expect(
      applyB1Filters(ROWS, { ...NONE, isNoShoot: true }).map((r) => r.id),
    ).toEqual(["a"]);
    expect(
      applyB1Filters(ROWS, { ...NONE, isMonthly: true }).map((r) => r.id),
    ).toEqual(["a", "b"]);
    expect(applyB1Filters(ROWS, NONE)).toHaveLength(4);
  });
});

describe("b1FilterGroups", () => {
  it("η Κατάσταση έχει κάθε κατάσταση με το πλήθος της", () => {
    const [status] = b1FilterGroups(ROWS, "", NONE).filters;
    expect(status?.options.map((o) => `${o.label} ${o.count}`)).toEqual([
      "Υποψήφιος 1",
      "Ενεργός 2",
      "Ανενεργός 0",
    ]);
    expect(status?.all?.isCurrent).toBe(true);
  });
  it("το πλήθος λογαριάζει τα άλλα φίλτρα που ισχύουν", () => {
    const [status, noShoot] = b1FilterGroups(ROWS, "", {
      ...NONE,
      isNoShoot: true,
    }).filters;
    expect(status?.options.find((o) => o.label === "Ενεργός")?.count).toBe(1);
    expect(noShoot?.options[0]?.isCurrent).toBe(true);
    expect(noShoot?.all?.href).toBe("/app/clients");
  });
});
