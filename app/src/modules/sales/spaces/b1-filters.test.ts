import { describe, expect, it } from "vitest";

import type { B1Row } from "./b1-adapter";
import {
  applyB1Filters,
  b1FilterGroups,
  b1Href,
  NO_PACKAGE,
  parseB1Filters,
  type B1Filters,
} from "./b1-filters";
import type { MonthGlance } from "./b1-month";

const NONE: B1Filters = { status: null, isNoShoot: false, pkg: null };

const month = (hasNoShoot: boolean): MonthGlance =>
  ({ hasNoShoot, meters: [], next: null, text: "" }) as unknown as MonthGlance;

const row = (
  id: string,
  status: string | null,
  glance: MonthGlance | null,
  packageName: string | null = null,
): B1Row =>
  ({
    id,
    name: id,
    status,
    month: glance,
    packageName,
    activeAgreements: packageName === null ? 0 : 1,
  }) as unknown as B1Row;

const ROWS = [
  row("a", "Ενεργός", month(true), "Social A"),
  row("b", "Ενεργός", month(false), "Podcast B, Social A"),
  row("c", "Υποψήφιος", null),
  row("d", null, null),
];

describe("parseB1Filters", () => {
  it("διαβάζει Κατάσταση, διακόπτη και Πακέτο από τη διεύθυνση", () => {
    expect(
      parseB1Filters({ status: "active", noshoot: "1", package: "Social A" }),
    ).toEqual({ status: "active", isNoShoot: true, pkg: "Social A" });
  });
  it("αγνοεί άγνωστη Κατάσταση και κενό Πακέτο", () => {
    expect(parseB1Filters({ status: "x", package: " " })).toEqual(NONE);
  });
});

describe("b1Href", () => {
  it("κρατά την αναζήτηση μαζί με τα φίλτρα", () => {
    expect(
      b1Href("Κυψέλη", { ...NONE, status: "inactive", pkg: NO_PACKAGE }),
    ).toBe(
      "/app/clients?q=%CE%9A%CF%85%CF%88%CE%AD%CE%BB%CE%B7&status=inactive&package=-",
    );
  });
  it("χωρίς τίποτα: η καθαρή λίστα", () => {
    expect(b1Href("", NONE)).toBe("/app/clients");
  });
});

describe("applyB1Filters", () => {
  it("στενεύει ανά Κατάσταση, διακόπτη και Πακέτο", () => {
    const ids = (filters: B1Filters) =>
      applyB1Filters(ROWS, filters).map((r) => r.id);
    expect(ids({ ...NONE, status: "active" })).toEqual(["a", "b"]);
    expect(ids({ ...NONE, isNoShoot: true })).toEqual(["a"]);
    expect(ids({ ...NONE, pkg: "Social A" })).toEqual(["a", "b"]);
    expect(ids({ ...NONE, pkg: "Podcast B" })).toEqual(["b"]);
    expect(ids({ ...NONE, pkg: NO_PACKAGE })).toEqual(["c", "d"]);
    expect(ids(NONE)).toHaveLength(4);
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
  it("το Πακέτο δείχνει κάθε Πακέτο της λίστας και «Χωρίς Πακέτο»", () => {
    const pkg = b1FilterGroups(ROWS, "", NONE).filters[2];
    expect(pkg?.label).toBe("Πακέτο");
    expect(pkg?.options.map((o) => `${o.label} ${o.count}`)).toEqual([
      "Podcast B 1",
      "Social A 2",
      "Χωρίς Πακέτο 2",
    ]);
  });
  it("χωρίς Συμφωνίες στη λίστα (δεν τις βλέπει) δεν υπάρχει φίλτρο Πακέτου", () => {
    const hidden = ROWS.map((r) => ({ ...r, activeAgreements: null }) as B1Row);
    expect(b1FilterGroups(hidden, "", NONE).filters).toHaveLength(2);
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
