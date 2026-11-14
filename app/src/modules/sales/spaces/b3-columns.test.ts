import { describe, expect, it } from "vitest";

import { filterByColumns } from "@/spaces/kit/column-filters";

import type { BoardCard } from "./b3-adapter";
import { b3ColumnFilters, b3Href, parseB3Selection } from "./b3-columns";

const TODAY = "2026-11-14";

const card = (id: string, over: Partial<BoardCard>): BoardCard =>
  ({
    id,
    owner: "Άννα",
    source: "Ιστοσελίδα",
    outcome: "open",
    expectedClose: null,
    isLate: false,
    ...over,
  }) as BoardCard;

const CARDS = [
  card("late", { expectedClose: "2026-11-01", isLate: true }),
  card("month", { expectedClose: "2026-11-28", owner: "Βασίλης" }),
  card("later", { expectedClose: "2027-01-10", source: "Σύσταση" }),
  card("none", {}),
  card("won", { outcome: "won" }),
];

const ids = (selection: Record<string, string>) =>
  filterByColumns(CARDS, b3ColumnFilters(TODAY), selection).map((c) => c.id);

describe("φίλτρα του Pipeline", () => {
  it("κλείσιμο σε κλίμακες· οι κλεισμένες δεν ταιριάζουν", () => {
    expect(ids({ close: "late" })).toEqual(["late"]);
    expect(ids({ close: "month" })).toEqual(["month"]);
    expect(ids({ close: "later" })).toEqual(["later"]);
    expect(ids({ close: "none" })).toEqual(["none"]);
  });
  it("Υπεύθυνος και Πηγή", () => {
    expect(ids({ owner: "Βασίλης" })).toEqual(["month"]);
    expect(ids({ source: "Σύσταση" })).toEqual(["later"]);
  });
  it("διεύθυνση: μόνο τα keys του Pipeline", () => {
    expect(parseB3Selection({ owner: "Άννα", page: "2" })).toEqual({
      owner: "Άννα",
    });
    expect(b3Href({ close: "late" })).toBe("/app/pipeline?close=late");
  });
});
