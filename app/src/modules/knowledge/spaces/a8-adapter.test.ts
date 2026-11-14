import { describe, expect, it } from "vitest";

import type { Library } from "../view-schema";
import {
  athensDate,
  libraryGroups,
  onlySection,
  searchGroups,
} from "./a8-adapter";

const library = (
  overrides: Partial<Library["sections"][number]> = {},
): Library => ({
  sections: [
    {
      id: "s-1",
      name: "Γυρίσματα",
      description: "Πώς δουλεύουμε στο πλατό",
      items: [
        {
          id: "i-1",
          kind: "article",
          title: "Τι φέρνω",
          summary: "Λίστα",
          updatedAt: "2026-10-30T10:00:00Z",
        },
        {
          id: "i-2",
          kind: "file",
          title: "Οδηγός",
          summary: "PDF",
          updatedAt: "2026-10-31T23:30:00Z",
        },
      ],
      ...overrides,
    },
  ],
});

describe("A8 adapter", () => {
  it("should map sections to groups with prototype rows", () => {
    const [group] = libraryGroups(library());
    expect(group).toMatchObject({
      id: "s-1",
      title: "Γυρίσματα",
      blurb: "Πώς δουλεύουμε στο πλατό",
    });
    expect(group?.rows[0]).toEqual({
      id: "i-1",
      href: "/app/knowledge/i-1",
      letter: "Α",
      kindLabel: "Άρθρο",
      title: "Τι φέρνω",
      summary: "Λίστα",
      extra: "Ενημερώθηκε 30/10/2026",
    });
    expect(group?.rows[1]?.letter).toBe("Φ");
  });

  it("should hide sections without items", () => {
    expect(libraryGroups(library({ items: [] }))).toEqual([]);
  });

  it("should use the Athens day for dates near midnight", () => {
    expect(athensDate("2026-10-31T23:30:00Z")).toBe("01/11/2026");
  });

  it("should put search results in one group with the section name", () => {
    const groups = searchGroups("πλατό", {
      items: [
        {
          id: "i-1",
          kind: "article",
          title: "Τι φέρνω",
          summary: "Λίστα",
          sectionName: "Γυρίσματα",
        },
      ],
    });
    expect(groups).toHaveLength(1);
    expect(groups[0]?.title).toBe("Αποτελέσματα για «πλατό»");
    expect(groups[0]?.rows[0]?.extra).toBe("Ενότητα: Γυρίσματα");
  });

  it("should return no groups when the search finds nothing", () => {
    expect(searchGroups("x", { items: [] })).toEqual([]);
  });
});

describe("onlySection", () => {
  const groups = [
    { id: "s-1", title: "Γυρίσματα", blurb: "", rows: [] },
    { id: "s-2", title: "Πωλήσεις", blurb: "", rows: [] },
  ];

  it("should keep only the section of the address", () => {
    expect(onlySection(groups, "s-2").map((g) => g.title)).toEqual([
      "Πωλήσεις",
    ]);
  });

  it("should keep every section without one, and none for an unknown one", () => {
    expect(onlySection(groups, null)).toHaveLength(2);
    expect(onlySection(groups, "s-9")).toEqual([]);
  });
});
