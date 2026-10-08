import { describe, expect, it } from "vitest";

import { parseRoutingValue } from "./helpers";
import {
  LIST_TABLES,
  createListItemSchema,
  listItemRefSchema,
  moveListItemSchema,
  renameListItemSchema,
  retireStageSchema,
  routingSchema,
} from "./settings-schemas";

const ID = "6f1c2f1e-3b0a-4d6e-9d52-0a1b2c3d4e5f";

describe("LIST_TABLES", () => {
  it("δείχνει τον πίνακα κάθε λίστας", () => {
    expect(LIST_TABLES).toEqual({
      stages: "sales_stages",
      sources: "sales_sources",
      loss_reasons: "sales_loss_reasons",
      activity_kinds: "sales_activity_kinds",
    });
  });
});

describe("createListItemSchema", () => {
  it("δέχεται κάθε γνωστή λίστα και κόβει τα κενά", () => {
    const parsed = createListItemSchema.parse({
      list: "loss_reasons",
      label: "  Δεν είχε budget  ",
    });
    expect(parsed).toEqual({ list: "loss_reasons", label: "Δεν είχε budget" });
  });

  it("απορρίπτει άγνωστη λίστα", () => {
    const result = createListItemSchema.safeParse({
      list: "users",
      label: "x",
    });
    expect(result.success).toBe(false);
  });

  it("απορρίπτει κενή ετικέτα", () => {
    const result = createListItemSchema.safeParse({
      list: "sources",
      label: "   ",
    });
    expect(result.success).toBe(false);
    expect(result.error?.issues[0]?.message).toBe("Γράψε την ετικέτα.");
  });
});

describe("renameListItemSchema", () => {
  it("θέλει id τιμής και ετικέτα", () => {
    expect(
      renameListItemSchema.safeParse({ list: "stages", id: ID, label: "Νέο" })
        .success,
    ).toBe(true);
    expect(
      renameListItemSchema.safeParse({ list: "stages", id: "x", label: "Νέο" })
        .success,
    ).toBe(false);
    expect(
      renameListItemSchema.safeParse({ list: "stages", id: ID, label: "" })
        .success,
    ).toBe(false);
  });
});

describe("moveListItemSchema", () => {
  it("δέχεται μόνο up ή down", () => {
    expect(
      moveListItemSchema.safeParse({ list: "stages", id: ID, direction: "up" })
        .success,
    ).toBe(true);
    expect(
      moveListItemSchema.safeParse({
        list: "stages",
        id: ID,
        direction: "down",
      }).success,
    ).toBe(true);
    expect(
      moveListItemSchema.safeParse({
        list: "stages",
        id: ID,
        direction: "left",
      }).success,
    ).toBe(false);
  });
});

describe("listItemRefSchema", () => {
  it("δείχνει μια τιμή μιας λίστας", () => {
    expect(
      listItemRefSchema.safeParse({ list: "activity_kinds", id: ID }).success,
    ).toBe(true);
    expect(
      listItemRefSchema.safeParse({ list: "activity_kinds", id: "" }).success,
    ).toBe(false);
  });
});

describe("retireStageSchema", () => {
  it("αφήνει κενό το Στάδιο μεταφοράς όταν δεν υπάρχουν ανοιχτές Ευκαιρίες", () => {
    expect(
      retireStageSchema.safeParse({ stageId: ID, moveToId: "" }).success,
    ).toBe(true);
    expect(
      retireStageSchema.safeParse({ stageId: ID, moveToId: ID }).success,
    ).toBe(true);
  });

  it("απορρίπτει id που δεν είναι uuid", () => {
    expect(
      retireStageSchema.safeParse({ stageId: ID, moveToId: "abc" }).success,
    ).toBe(false);
  });
});

describe("routingSchema", () => {
  it("δέχεται owner, queue και id προσώπου", () => {
    expect(routingSchema.safeParse({ value: "owner" }).success).toBe(true);
    expect(routingSchema.safeParse({ value: "queue" }).success).toBe(true);
    expect(routingSchema.safeParse({ value: ID }).success).toBe(true);
  });

  it("απορρίπτει κενό ή άγνωστη τιμή", () => {
    expect(routingSchema.safeParse({ value: "" }).success).toBe(false);
    expect(routingSchema.safeParse({ value: "x" }).success).toBe(false);
  });

  it("συμφωνεί με το parseRoutingValue", () => {
    expect(parseRoutingValue(ID)).toEqual({
      routing: "person",
      assigneeId: ID,
    });
  });
});
