import { describe, expect, it } from "vitest";

import { filterByColumns } from "@/spaces/kit/column-filters";

import type { B1Columns, B1Row } from "./b1-adapter";
import { b1ColumnFilters } from "./b1-columns";
import { b1Href, parseB1Filters } from "./b1-filters";

const TODAY = "2026-11-14";
const ALL: B1Columns = {
  showOwner: true,
  showOpportunities: true,
  showAgreements: true,
  showBalance: true,
};

const row = (id: string, fields: Partial<B1Row>): B1Row => ({
  id,
  href: `/app/clients/${id}`,
  name: id,
  city: "",
  status: null,
  owner: "Άννα",
  openOpportunities: null,
  packageName: null,
  activeAgreements: null,
  balance: null,
  hasBalance: null,
  isPossibleDuplicate: false,
  mergeHref: "",
  lastContact: null,
  month: null,
  ownership: null,
  isTaken: false,
  ...fields,
});

const ROWS = [
  row("a", {
    city: "Αθήνα",
    openOpportunities: 2,
    hasBalance: true,
    lastContact: "2026-11-10",
  }),
  row("b", {
    city: "Πάτρα",
    owner: "Βασίλης",
    openOpportunities: 0,
    hasBalance: false,
    lastContact: "2026-10-01",
  }),
  row("c", { city: "Αθήνα", activeAgreements: 1 }),
];

const keysOf = (columns: B1Columns) =>
  b1ColumnFilters(TODAY, columns).map((column) => column.key);

describe("b1ColumnFilters", () => {
  it("ένα φίλτρο ανά στήλη που βλέπει ο Χρήστης", () => {
    expect(keysOf(ALL)).toEqual([
      "city",
      "owner",
      "opps",
      "agreements",
      "balance",
      "contact",
    ]);
    expect(
      keysOf({ ...ALL, showOwner: false, showOpportunities: false }),
    ).toEqual(["city", "opps", "agreements", "balance"]);
  });

  it("φιλτράρει Πόλη, Υπόλοιπο και Τελευταία επαφή", () => {
    const columns = b1ColumnFilters(TODAY, ALL);
    const ids = (selection: Record<string, string>) =>
      filterByColumns(ROWS, columns, selection).map((r) => r.id);
    expect(ids({ city: "Αθήνα" })).toEqual(["a", "c"]);
    expect(ids({ balance: "yes" })).toEqual(["a"]);
    expect(ids({ contact: "old" })).toEqual(["b"]);
    expect(ids({ contact: "none" })).toEqual(["c"]);
    expect(ids({ opps: "no" })).toEqual(["b"]);
  });

  it("τιμή που ο Χρήστης δεν βλέπει (null) δεν ταιριάζει σε καμία επιλογή", () => {
    const columns = b1ColumnFilters(TODAY, ALL);
    const ids = (selection: Record<string, string>) =>
      filterByColumns(ROWS, columns, selection).map((r) => r.id);
    expect(ids({ agreements: "no" })).toEqual([]);
  });
});

describe("φίλτρα στηλών στη διεύθυνση", () => {
  it("τα keys των στηλών μπαίνουν στο columns μόνο όταν υπάρχουν", () => {
    expect(parseB1Filters({ city: "Αθήνα", other: "x" }).columns).toEqual({
      city: "Αθήνα",
    });
    expect(parseB1Filters({}).columns).toBeUndefined();
  });

  it("το href κρατά στήλες και βάζει σελίδα μόνο μετά την πρώτη", () => {
    const filters = parseB1Filters({ status: "active", city: "Πάτρα" });
    expect(b1Href("ab", filters, 3)).toBe(
      "/app/clients?q=ab&status=active&city=%CE%A0%CE%AC%CF%84%CF%81%CE%B1&page=3",
    );
    expect(b1Href("", filters, 1)).not.toContain("page=");
  });
});
