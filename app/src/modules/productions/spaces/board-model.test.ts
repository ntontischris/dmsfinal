import { describe, expect, it } from "vitest";

import type { ProductionCard, ProductionStage } from "../types";
import { NO_STAGE, boardColumnsOf, parseMode } from "./board-model";

const stage = (id: string, isActive = true): ProductionStage => ({
  id,
  label: `Στάδιο ${id}`,
  isActive,
});

const card = (id: string, stageId: string | null): ProductionCard => ({
  id,
  title: `Παραγωγή ${id}`,
  client: null,
  period: null,
  owner: null,
  state: "open",
  isInternal: true,
  stage: stageId ? { id: stageId, label: `Στάδιο ${stageId}` } : null,
});

describe("boardColumnsOf", () => {
  it("should make one column per active stage in order, then the no-stage column", () => {
    const columns = boardColumnsOf(
      [card("p1", "b"), card("p2", null), card("p3", "a")],
      [stage("a"), stage("b")],
    );
    expect(columns.map((column) => column.label)).toEqual([
      "Στάδιο a",
      "Στάδιο b",
      NO_STAGE,
    ]);
    expect(columns.map((column) => column.cards.map((item) => item.id))).toEqual([
      ["p3"],
      ["p1"],
      ["p2"],
    ]);
  });

  it("should put productions of an inactive stage in the no-stage column", () => {
    const columns = boardColumnsOf([card("p1", "old")], [stage("a"), stage("old", false)]);
    expect(columns.map((column) => column.label)).toEqual(["Στάδιο a", NO_STAGE]);
    expect(columns[1].cards.map((item) => item.id)).toEqual(["p1"]);
  });
});

describe("parseMode", () => {
  it("should default to the list", () => {
    expect(parseMode(undefined, true)).toBe("list");
    expect(parseMode("other", true)).toBe("list");
  });

  it("should show the board to everyone", () => {
    expect(parseMode("board", false)).toBe("board");
  });

  it("should show the workload only to those who see every production", () => {
    expect(parseMode("load", true)).toBe("load");
    expect(parseMode("load", false)).toBe("list");
  });
});
