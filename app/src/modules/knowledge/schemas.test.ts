import { describe, expect, it } from "vitest";

import {
  attachSchema,
  itemSchema,
  newItemSchema,
  sectionSchema,
} from "./schemas";
import {
  ERROR_FILE_TYPE,
  ERROR_IMAGE_TYPE,
  ERROR_TOO_BIG,
  formatSize,
  uploadError,
} from "./upload-rules";
import { parseLibrary, parseManageItem } from "./view-schema";

const ID = "11111111-1111-4111-8111-111111111111";

describe("form schemas", () => {
  it("should treat an empty section id as a new section", () => {
    expect(
      sectionSchema.parse({ id: "", name: " Οδηγοί ", description: "" }),
    ).toEqual({
      id: null,
      name: "Οδηγοί",
      description: "",
    });
    expect(
      sectionSchema.safeParse({ id: "", name: "  ", description: "" }).success,
    ).toBe(false);
  });

  it("should require a section, a kind and a title for a new item", () => {
    expect(
      newItemSchema.safeParse({
        sectionId: ID,
        kind: "article",
        title: "Οδηγός",
      }).success,
    ).toBe(true);
    expect(
      newItemSchema.safeParse({
        sectionId: "",
        kind: "article",
        title: "Οδηγός",
      }).success,
    ).toBe(false);
    expect(
      newItemSchema.safeParse({ sectionId: ID, kind: "video", title: "Οδηγός" })
        .success,
    ).toBe(false);
  });

  it("should allow an empty summary while drafting but cap its length", () => {
    const base = { id: ID, sectionId: ID, title: "Τίτλος", body: "" };
    expect(itemSchema.safeParse({ ...base, summary: "" }).success).toBe(true);
    expect(
      itemSchema.safeParse({ ...base, summary: "x".repeat(401) }).success,
    ).toBe(false);
  });

  it("should only accept file paths of the item folder", () => {
    const path = `${ID}/file-${ID}.pdf`;
    expect(
      attachSchema.safeParse({ itemId: ID, path, name: "οδηγός.pdf" }).success,
    ).toBe(true);
    expect(
      attachSchema.safeParse({
        itemId: ID,
        path: `${ID}/img-${ID}.png`,
        name: "x",
      }).success,
    ).toBe(false);
    expect(
      attachSchema.safeParse({ itemId: ID, path: `../${ID}.pdf`, name: "x" })
        .success,
    ).toBe(false);
  });
});

describe("upload rules", () => {
  it("should match the database rules for files and article images", () => {
    expect(
      uploadError("file", { type: "application/pdf", size: 1000 }),
    ).toBeNull();
    expect(uploadError("file", { type: "application/zip", size: 1000 })).toBe(
      ERROR_FILE_TYPE,
    );
    expect(uploadError("image", { type: "application/pdf", size: 1000 })).toBe(
      ERROR_IMAGE_TYPE,
    );
    expect(uploadError("image", { type: "image/gif", size: 1000 })).toBeNull();
    expect(
      uploadError("file", {
        type: "application/pdf",
        size: 25 * 1024 * 1024 + 1,
      }),
    ).toBe(ERROR_TOO_BIG);
  });

  it("should format sizes in Greek", () => {
    expect(formatSize(500)).toBe("500 B");
    expect(formatSize(2048)).toBe("2 KB");
    expect(formatSize(1.5 * 1024 * 1024)).toBe("1,5 MB");
  });
});

describe("view schemas", () => {
  it("should parse the library and the editor payloads", () => {
    expect(
      parseLibrary({
        sections: [
          {
            id: ID,
            name: "Οδηγοί",
            description: "",
            items: [
              {
                id: ID,
                kind: "article",
                title: "Τ",
                summary: "Π",
                updatedAt: "2026-10-17T10:00:00Z",
              },
            ],
          },
        ],
      }).sections[0]?.items,
    ).toHaveLength(1);
    expect(
      parseManageItem({
        item: null,
        sections: [],
        roles: [{ id: ID, name: "Πλήρης", kind: "client" }],
      }).item,
    ).toBeNull();
  });

  it("should reject an unknown item kind loudly", () => {
    expect(() =>
      parseLibrary({
        sections: [
          {
            id: ID,
            name: "x",
            description: "",
            items: [{ id: ID, kind: "video" }],
          },
        ],
      }),
    ).toThrow();
  });
});
