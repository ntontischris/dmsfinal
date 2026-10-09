import { describe, expect, it } from "vitest";

import {
  categoriesViewSchema,
  itemDetailSchema,
  templatesViewSchema,
} from "./view-schema";

const ITEM_ID = "44444444-4444-4444-8444-444444444444";
const CATEGORY_ID = "55555555-5555-4555-8555-555555555555";

describe("categoriesViewSchema", () => {
  it("should read the item count as a number and map the retired flag", () => {
    const [row] = categoriesViewSchema.parse([
      {
        id: CATEGORY_ID,
        name: "Drone",
        sort_order: 6,
        is_retired: true,
        item_count: "3",
        updated_at: "2026-10-09T10:00:00Z",
      },
    ]);
    expect(row).toEqual({
      id: CATEGORY_ID,
      name: "Drone",
      sortOrder: 6,
      isRetired: true,
      itemCount: 3,
      updatedAt: "2026-10-09T10:00:00Z",
    });
  });

  it("should reject a status the database does not know", () => {
    expect(() =>
      templatesViewSchema.parse([
        {
          id: ITEM_ID,
          name: "Ζωντανή",
          note: null,
          items: [{ id: CATEGORY_ID, name: "Κάμερα", status: "lost" }],
          updated_at: "2026-10-09T10:00:00Z",
        },
      ]),
    ).toThrow();
  });
});

describe("templatesViewSchema", () => {
  it("should treat a missing item list as an empty template", () => {
    const [row] = templatesViewSchema.parse([
      {
        id: ITEM_ID,
        name: "Ζωντανή",
        note: null,
        items: null,
        updated_at: "2026-10-09T10:00:00Z",
      },
    ]);
    expect(row?.items).toEqual([]);
  });
});

describe("itemDetailSchema", () => {
  it("should map the item, its templates and its history from the database JSON", () => {
    const detail = itemDetailSchema.parse({
      id: ITEM_ID,
      name: "Gimbal",
      code: null,
      note: "Στο ντουλάπι",
      status: "in_repair",
      status_note: "Κολλημένος άξονας, επιστρέφει Δευτέρα",
      category_id: CATEGORY_ID,
      category_name: "Στήριξη και σταθεροποίηση",
      category_retired: false,
      updated_at: "2026-10-09T10:00:00Z",
      updated_by_name: "Γιώργος Ιδιοκτήτης",
      templates: [{ id: ITEM_ID, name: "Ζωντανή" }],
      history: [
        {
          at: "2026-10-09T10:00:00Z",
          action: "event",
          event: "status_changed",
          actor_name: "Γιώργος Ιδιοκτήτης",
          before: null,
          after: {
            event: "status_changed",
            from: "available",
            to: "in_repair",
            note: "Κολλημένος άξονας",
          },
        },
      ],
    });
    expect(detail.statusNote).toBe("Κολλημένος άξονας, επιστρέφει Δευτέρα");
    expect(detail.updatedByName).toBe("Γιώργος Ιδιοκτήτης");
    expect(detail.templates).toEqual([{ id: ITEM_ID, name: "Ζωντανή" }]);
    expect(detail.history[0]?.actorName).toBe("Γιώργος Ιδιοκτήτης");
  });
});
