import { describe, expect, test } from "vitest";

import {
  columnFilterGroups,
  filterByColumns,
  selectionOf,
  type ColumnFilter,
  type ColumnSelection,
} from "./column-filters";
import { pageOf, parsePage } from "./pager-model";

interface Row {
  name: string;
  owner: string;
  tags: string[];
}

const rows: Row[] = [
  { name: "a", owner: "Άννα", tags: ["x"] },
  { name: "b", owner: "Βασίλης", tags: ["x", "y"] },
  { name: "c", owner: "Άννα", tags: [] },
];

const columns: ColumnFilter<Row>[] = [
  {
    key: "owner",
    label: "Υπεύθυνος",
    valuesOf: (row) => [{ value: row.owner, label: row.owner }],
  },
  {
    key: "tag",
    label: "Ετικέτα",
    valuesOf: (row) => row.tags.map((tag) => ({ value: tag, label: tag })),
  },
];

const hrefWith = (selection: ColumnSelection) =>
  `/x?${Object.entries(selection)
    .filter(([, v]) => v !== undefined)
    .map(([k, v]) => `${k}=${v}`)
    .join("&")}`;

describe("selectionOf", () => {
  test("κρατά μόνο τα keys των στηλών, χωρίς κενά", () => {
    expect(
      selectionOf(["owner", "tag"], { owner: " Άννα ", tag: "", other: "z" }),
    ).toEqual({ owner: "Άννα" });
  });
});

describe("filterByColumns", () => {
  test("χωρίς επιλογή περνούν όλες", () => {
    expect(filterByColumns(rows, columns, {})).toHaveLength(3);
  });
  test("όλες οι στήλες μαζί, και σε κελί με λίστα", () => {
    expect(
      filterByColumns(rows, columns, { owner: "Άννα", tag: "x" }).map(
        (r) => r.name,
      ),
    ).toEqual(["a"]);
    expect(
      filterByColumns(rows, columns, { tag: "y" }).map((r) => r.name),
    ).toEqual(["b"]);
  });
});

describe("columnFilterGroups", () => {
  test("μία κάρτα ανά στήλη, αλφαβητικά, με αριθμό που κρατά τις άλλες στήλες", () => {
    const [owner, tag] = columnFilterGroups({
      rows,
      columns,
      selection: { tag: "x" },
      hrefWith,
    });
    expect(owner?.options.map((o) => [o.label, o.count])).toEqual([
      ["Άννα", 1],
      ["Βασίλης", 1],
    ]);
    expect(owner?.all?.isCurrent).toBe(true);
    expect(tag?.all?.isCurrent).toBe(false);
    expect(tag?.options.find((o) => o.isCurrent)?.href).toBe("/x?tag=x");
    expect(owner?.options[0]?.href).toBe("/x?tag=x&owner=Άννα");
  });
  test("στήλη με μία τιμή και χωρίς επιλογή δεν βγάζει κάρτα", () => {
    const groups = columnFilterGroups({
      rows: rows.slice(0, 1),
      columns,
      selection: {},
      hrefWith,
    });
    expect(groups).toEqual([]);
  });
});

describe("pageOf", () => {
  const items = Array.from({ length: 120 }, (_, i) => i + 1);
  test("κόβει σε σελίδες και λέει πού είμαστε", () => {
    expect(pageOf(items, 2, 50)).toMatchObject({
      page: 2,
      pageCount: 3,
      total: 120,
      from: 51,
      to: 100,
    });
  });
  test("σελίδα πέρα από το τέλος δείχνει την τελευταία· κενή λίστα = 0", () => {
    expect(pageOf(items, 9, 50).items).toEqual(items.slice(100));
    expect(pageOf([], 3, 50)).toMatchObject({ page: 1, from: 0, to: 0 });
  });
  test("parsePage δέχεται μόνο θετικούς ακεραίους", () => {
    expect(parsePage("3")).toBe(3);
    expect(parsePage("0")).toBe(1);
    expect(parsePage("x")).toBe(1);
    expect(parsePage(undefined)).toBe(1);
  });
});
