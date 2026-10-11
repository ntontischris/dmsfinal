import { describe, expect, it } from "vitest";

import {
  bodySchema,
  deleteSchema,
  deletedSchema,
  editSchema,
  sendSchema,
  tagSchema,
  uploadRequestSchema,
} from "./schemas";

const ID = "7c0c4d6e-2f3a-4b5c-8d9e-0a1b2c3d4e5f";
const OTHER = "1b2c3d4e-5f60-4a7b-9c8d-9e0f1a2b3c4d";

describe("bodySchema", () => {
  it("κόβει τα κενά γύρω γύρω", () => {
    expect(bodySchema.parse("  γεια  ")).toBe("γεια");
  });
  it("απορρίπτει κενό", () => {
    expect(bodySchema.safeParse("   ").success).toBe(false);
  });
  it("δέχεται 4.000 και απορρίπτει 4.001 χαρακτήρες", () => {
    expect(bodySchema.safeParse("x".repeat(4000)).success).toBe(true);
    expect(bodySchema.safeParse("x".repeat(4001)).success).toBe(false);
  });
  it("δέχεται https και απορρίπτει http", () => {
    expect(bodySchema.safeParse("δες https://example.com").success).toBe(true);
    expect(bodySchema.safeParse("δες http://example.com").success).toBe(false);
    expect(bodySchema.safeParse("HTTP://EXAMPLE.COM").success).toBe(false);
  });
});

describe("sendSchema", () => {
  const base = {
    clientId: ID,
    productionId: "",
    body: "Γεια",
    internal: false,
    mentions: [],
    attachments: [] as string[],
  };
  const path = (n: number) => `${ID}/7c0c4d6e-2f3a-4b5c-8d9e-0a1b2c3d4e5${n}.pdf`;
  it("δέχεται Μήνυμα χωρίς ετικέτα", () => {
    expect(sendSchema.parse(base).productionId).toBeNull();
  });
  it("απορρίπτει αναφορές σε μη Εσωτερικό", () => {
    expect(sendSchema.safeParse({ ...base, mentions: [OTHER] }).success).toBe(
      false,
    );
  });
  it("δέχεται αναφορές σε Εσωτερικό", () => {
    expect(
      sendSchema.safeParse({ ...base, internal: true, mentions: [OTHER] })
        .success,
    ).toBe(true);
  });
  it("δέχεται Μήνυμα μόνο με συνημμένα (χωρίς κείμενο)", () => {
    expect(sendSchema.safeParse({ ...base, body: "  ", attachments: [path(1)] }).success).toBe(true);
  });
  it("απορρίπτει Μήνυμα χωρίς κείμενο και χωρίς συνημμένα", () => {
    expect(sendSchema.safeParse({ ...base, body: "  " }).success).toBe(false);
  });
  it("δέχεται έως 5 συνημμένα και απορρίπτει 6", () => {
    const five = [1, 2, 3, 4, 5].map(path);
    expect(sendSchema.safeParse({ ...base, attachments: five }).success).toBe(true);
    expect(sendSchema.safeParse({ ...base, attachments: [...five, path(6)] }).success).toBe(false);
  });
  it("απορρίπτει διαδρομή που δεν έδωσε η βάση", () => {
    expect(sendSchema.safeParse({ ...base, attachments: ["../../etc/passwd"] }).success).toBe(false);
  });
  it("απορρίπτει άκυρο id Πελάτη", () => {
    expect(sendSchema.safeParse({ ...base, clientId: "x" }).success).toBe(
      false,
    );
  });
});

describe("άλλες φόρμες", () => {
  it("editSchema θέλει id και κείμενο", () => {
    expect(editSchema.safeParse({ id: ID, body: "ok" }).success).toBe(true);
    expect(editSchema.safeParse({ id: ID, body: "" }).success).toBe(false);
  });
  it("deleteSchema θέλει id", () => {
    expect(deleteSchema.safeParse({ id: "x" }).success).toBe(false);
  });
  it("tagSchema δέχεται κενή ετικέτα ως null", () => {
    expect(
      tagSchema.parse({ id: ID, productionId: "" }).productionId,
    ).toBeNull();
  });
});

describe("uploadRequestSchema", () => {
  const file = { name: "προσφορά.pdf", mime: "application/pdf", size: 1000 };
  it("δέχεται 1 έως 5 αρχεία", () => {
    expect(uploadRequestSchema.safeParse({ clientId: ID, productionId: "", files: [file] }).success).toBe(true);
    expect(
      uploadRequestSchema.safeParse({ clientId: ID, productionId: "", files: Array(6).fill(file) }).success,
    ).toBe(false);
  });
  it("απορρίπτει κενή λίστα και μηδενικό μέγεθος", () => {
    expect(uploadRequestSchema.safeParse({ clientId: ID, productionId: "", files: [] }).success).toBe(false);
    expect(
      uploadRequestSchema.safeParse({ clientId: ID, productionId: "", files: [{ ...file, size: 0 }] }).success,
    ).toBe(false);
  });
});

describe("deletedSchema", () => {
  it("διαβάζει τις διαδρομές που σβήνονται", () => {
    expect(deletedSchema.parse({ removedPaths: ["a/b.pdf"] }).removedPaths).toEqual(["a/b.pdf"]);
  });
});
