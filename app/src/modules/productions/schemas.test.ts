import { describe, expect, it } from "vitest";

import {
  cancelSchema,
  createInternalSchema,
  deliverSchema,
  listFilterSchema,
  memberSchema,
  reopenSchema,
  transferSchema,
} from "./schemas";

const PRODUCTION_ID = "11111111-1111-4111-8111-111111111111";
const USER_ID = "22222222-2222-4222-8222-222222222222";

type Outcome = { success: boolean; error?: { issues: { message: string }[] } };

const firstMessage = (result: Outcome): string | null =>
  result.success ? null : (result.error?.issues[0]?.message ?? null);

describe("listFilterSchema", () => {
  it("should default to the open tab without the internal toggle", () => {
    expect(listFilterSchema.parse({})).toEqual({
      tab: "open",
      internal: false,
    });
  });

  it("should fall back to the open tab for an unknown tab", () => {
    expect(listFilterSchema.parse({ tab: "παράξενο" }).tab).toBe("open");
  });

  it("should read the internal toggle from the value 1", () => {
    expect(listFilterSchema.parse({ tab: "all", internal: "1" })).toEqual({
      tab: "all",
      internal: true,
    });
  });
});

describe("createInternalSchema", () => {
  it("should trim the title and turn an empty owner into null", () => {
    expect(
      createInternalSchema.parse({ title: "  Showreel  ", ownerId: "" }),
    ).toEqual({
      title: "Showreel",
      ownerId: null,
    });
  });

  it("should reject a blank title with the Greek message", () => {
    expect(
      firstMessage(
        createInternalSchema.safeParse({ title: "   ", ownerId: "" }),
      ),
    ).toBe("Γράψε τίτλο για την Παραγωγή.");
  });

  it("should reject a title longer than 300 characters", () => {
    expect(
      firstMessage(
        createInternalSchema.safeParse({ title: "α".repeat(301), ownerId: "" }),
      ),
    ).toBe("Ο τίτλος είναι μέχρι 300 χαρακτήρες.");
  });
});

describe("transition schemas", () => {
  it("should require a note to deliver", () => {
    expect(
      firstMessage(
        deliverSchema.safeParse({ productionId: PRODUCTION_ID, note: " " }),
      ),
    ).toBe("Η παράδοση θέλει σχόλιο: τι παραδόθηκε και πού.");
  });

  it("should require a reason to reopen", () => {
    expect(
      firstMessage(
        reopenSchema.safeParse({ productionId: PRODUCTION_ID, reason: "" }),
      ),
    ).toBe("Η επανάνοιξη θέλει λόγο.");
  });

  it("should require a reason to cancel", () => {
    expect(
      firstMessage(
        cancelSchema.safeParse({ productionId: PRODUCTION_ID, reason: "" }),
      ),
    ).toBe("Η ακύρωση θέλει λόγο.");
  });

  it("should accept a delivery with a note", () => {
    expect(
      deliverSchema.safeParse({
        productionId: PRODUCTION_ID,
        note: "Drive, φάκελος Οκτωβρίου",
      }).success,
    ).toBe(true);
  });
});

describe("team schemas", () => {
  it("should ask for a new owner to be picked", () => {
    expect(
      firstMessage(
        transferSchema.safeParse({ productionId: PRODUCTION_ID, ownerId: "" }),
      ),
    ).toBe("Διάλεξε Υπεύθυνο.");
  });

  it("should ask for a member to be picked", () => {
    expect(
      firstMessage(
        memberSchema.safeParse({ productionId: PRODUCTION_ID, userId: "" }),
      ),
    ).toBe("Διάλεξε Μέλος.");
  });

  it("should accept a member with a valid id", () => {
    expect(
      memberSchema.safeParse({ productionId: PRODUCTION_ID, userId: USER_ID })
        .success,
    ).toBe(true);
  });
});
