// PROTOTYPE — throwaway.
import { describe, expect, it } from "vitest";

import type { B1Row } from "../b1-adapter";
import { answersOf, laneOf, rowsOfPick } from "./list-model";

const rowOf = (over: Partial<B1Row>): B1Row => ({
  id: "1",
  href: "/app/clients/1",
  name: "Δείγμα",
  city: "",
  status: "Ενεργός",
  owner: "",
  openOpportunities: 0,
  packageName: null,
  activeAgreements: 0,
  balance: null,
  hasBalance: false,
  isPossibleDuplicate: false,
  mergeHref: "/app/clients/duplicates",
  lastContact: "2026-11-20",
  month: null,
  ownership: null,
  isTaken: false,
  ...over,
});

const TODAY = "2026-11-26";

describe("list-model", () => {
  it("should count only clients who owe as the owes answer", () => {
    const rows = [rowOf({ hasBalance: true }), rowOf({ id: "2" })];
    expect(rowsOfPick(rows, "owes", TODAY)).toHaveLength(1);
    expect(answersOf(rows, TODAY).map((a) => a.title)).toEqual(["1 χρωστά"]);
  });

  it("should put an active client without recent contact in the quiet lane", () => {
    expect(laneOf(rowOf({ lastContact: "2026-08-01" }), TODAY)).toBe("quiet");
    expect(laneOf(rowOf({}), TODAY)).toBe("running");
    expect(laneOf(rowOf({ hasBalance: true }), TODAY)).toBe("needs");
  });

  it("should never count a client of another salesman", () => {
    const rows = [rowOf({ hasBalance: true, isTaken: true })];
    expect(answersOf(rows, TODAY)).toEqual([]);
  });
});
