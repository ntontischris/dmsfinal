import { describe, expect, it } from "vitest";

import type { ManageItemRow } from "../view-schema";
import { l1Filters, l1RowOf, manageHref } from "./l1-adapter";

const item = (overrides: Partial<ManageItemRow> = {}): ManageItemRow => ({
  id: "i-1",
  sectionId: "s-1",
  sectionName: "Γυρίσματα",
  kind: "article",
  title: "Τι φέρνω",
  summary: "Λίστα",
  status: "draft",
  publishedAt: null,
  updatedAt: "2026-10-30T10:00:00Z",
  updatedByName: "Άννα",
  textStatus: null,
  audience: {
    isPublic: true,
    roles: [{ id: "r-1", name: "Πλήρης", kind: "client" }],
  },
  ...overrides,
});

describe("L1 adapter", () => {
  it("should describe an item like the prototype row", () => {
    expect(l1RowOf(item())).toEqual({
      id: "i-1",
      href: "/app/knowledge/manage/i-1",
      letter: "Α",
      title: "Τι φέρνω",
      facts: "Άρθρο · Γυρίσματα · Κοινό: δημόσιο, Πλήρης (πελάτη)",
      updated: "ενημερώθηκε 30/10/2026 από Άννα",
      isImageOnly: false,
      status: "πρόχειρο",
      tone: "waiting",
    });
  });

  it("should mark published items as strong and image-only files", () => {
    const row = l1RowOf(
      item({
        status: "published",
        kind: "file",
        textStatus: "image_only",
        updatedByName: null,
      }),
    );
    expect(row).toMatchObject({
      tone: "strong",
      status: "δημοσιευμένο",
      isImageOnly: true,
      letter: "Φ",
    });
    expect(row.updated).toBe("ενημερώθηκε 30/10/2026");
  });

  it("should keep the section in every status filter", () => {
    expect(l1Filters("draft", "s-1")).toEqual([
      {
        label: "όλα",
        href: "/app/knowledge/manage?section=s-1",
        isCurrent: false,
      },
      {
        label: "πρόχειρα",
        href: "/app/knowledge/manage?status=draft&section=s-1",
        isCurrent: true,
      },
      {
        label: "δημοσιευμένα",
        href: "/app/knowledge/manage?status=published&section=s-1",
        isCurrent: false,
      },
    ]);
  });

  it("should drop empty params from the manage link", () => {
    expect(manageHref({ status: null, section: null })).toBe(
      "/app/knowledge/manage",
    );
  });
});
