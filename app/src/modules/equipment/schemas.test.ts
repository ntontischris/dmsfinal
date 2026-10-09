import { describe, expect, it } from "vitest";

import {
  categoryNameSchema,
  createItemSchema,
  createTemplateSchema,
  formItemIds,
  setStatusSchema,
} from "./schemas";

const CATEGORY_ID = "11111111-1111-4111-8111-111111111111";
const ITEM_ID = "22222222-2222-4222-8222-222222222222";

const itemInput = {
  categoryId: CATEGORY_ID,
  name: "Κάμερα Sony",
  code: "",
  note: "",
};

describe("categoryNameSchema", () => {
  it("should trim the category name when valid", () => {
    expect(categoryNameSchema.parse({ name: "  Κάμερες  " })).toEqual({
      name: "Κάμερες",
    });
  });

  it("should reject an empty category name with the Greek message", () => {
    const result = categoryNameSchema.safeParse({ name: "   " });
    expect(result.success).toBe(false);
    expect(result.error?.issues[0]?.message).toBe("Γράψε όνομα.");
  });
});

describe("createItemSchema", () => {
  it("should accept an item without code or note", () => {
    expect(createItemSchema.safeParse(itemInput).success).toBe(true);
  });

  it("should reject an item without a category", () => {
    const result = createItemSchema.safeParse({ ...itemInput, categoryId: "" });
    expect(result.success).toBe(false);
    expect(result.error?.issues[0]?.message).toBe("Διάλεξε Κατηγορία.");
  });

  it("should reject a name longer than 120 characters", () => {
    const result = createItemSchema.safeParse({
      ...itemInput,
      name: "α".repeat(121),
    });
    expect(result.success).toBe(false);
  });
});

describe("setStatusSchema", () => {
  it("should require a reason when an item goes to repair", () => {
    const result = setStatusSchema.safeParse({
      itemId: ITEM_ID,
      status: "in_repair",
      note: "",
    });
    expect(result.success).toBe(false);
    expect(result.error?.issues[0]?.message).toBe(
      "Η επισκευή θέλει λόγο: τι έπαθε και πότε επιστρέφει.",
    );
  });

  it("should accept a repair with a reason", () => {
    const result = setStatusSchema.safeParse({
      itemId: ITEM_ID,
      status: "in_repair",
      note: "Σπασμένο καλώδιο",
    });
    expect(result.success).toBe(true);
  });

  it("should accept a retirement without a reason", () => {
    expect(
      setStatusSchema.safeParse({
        itemId: ITEM_ID,
        status: "retired",
        note: "",
      }).success,
    ).toBe(true);
  });

  it("should reject an unknown status", () => {
    expect(
      setStatusSchema.safeParse({ itemId: ITEM_ID, status: "lost", note: "" })
        .success,
    ).toBe(false);
  });
});

describe("createTemplateSchema", () => {
  it("should require at least one item", () => {
    const result = createTemplateSchema.safeParse({
      name: "Ζωντανή",
      note: "",
      itemIds: [],
    });
    expect(result.success).toBe(false);
    expect(result.error?.issues[0]?.message).toBe(
      "Διάλεξε τουλάχιστον ένα αντικείμενο.",
    );
  });

  it("should accept a template with items", () => {
    const result = createTemplateSchema.safeParse({
      name: "Ζωντανή",
      note: "",
      itemIds: [ITEM_ID],
    });
    expect(result.success).toBe(true);
  });
});

describe("formItemIds", () => {
  it("should read every checked item id from the form", () => {
    const form = new FormData();
    form.append("itemIds", ITEM_ID);
    form.append("itemIds", CATEGORY_ID);
    expect(formItemIds(form)).toEqual([ITEM_ID, CATEGORY_ID]);
  });

  it("should return an empty list when nothing is checked", () => {
    expect(formItemIds(new FormData())).toEqual([]);
  });
});
