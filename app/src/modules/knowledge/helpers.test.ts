import { describe, expect, it } from "vitest";

import {
  audienceFromForm,
  audienceText,
  parseManageTab,
  parseQuery,
  parseStatusFilter,
  publishBlockers,
} from "./helpers";

const ROLE = { id: "r1", name: "Πλήρης", kind: "client" as const };

const draft = (
  change: Partial<Parameters<typeof publishBlockers>[0]> = {},
) => ({
  kind: "article" as const,
  summary: "Δύο γραμμές.",
  body: "Κείμενο",
  hasFile: false,
  audience: { isPublic: false, roles: [ROLE] },
  ...change,
});

describe("publishBlockers", () => {
  it("should allow publishing when summary, audience and text exist", () => {
    expect(publishBlockers(draft())).toEqual([]);
  });

  it("should list the missing summary, audience and article text in the database order", () => {
    expect(
      publishBlockers(
        draft({
          summary: "  ",
          body: "",
          audience: { isPublic: false, roles: [] },
        }),
      ),
    ).toEqual([
      "Λείπει η Περίληψη.",
      "Λείπει το Κοινό.",
      "Λείπει το κείμενο του Άρθρου.",
    ]);
  });

  it("should require an uploaded file for a file item", () => {
    expect(publishBlockers(draft({ kind: "file", body: null }))).toEqual([
      "Λείπει το Αρχείο.",
    ]);
    expect(
      publishBlockers(draft({ kind: "file", body: null, hasFile: true })),
    ).toEqual([]);
  });

  it("should accept public as an audience on its own", () => {
    expect(
      publishBlockers(draft({ audience: { isPublic: true, roles: [] } })),
    ).toEqual([]);
  });
});

describe("audience", () => {
  it("should describe public and roles in one line", () => {
    expect(
      audienceText({
        isPublic: true,
        roles: [ROLE, { id: "r2", name: "Πωλήσεις", kind: "team" }],
      }),
    ).toBe("δημόσιο, Πλήρης (πελάτη), Πωλήσεις");
    expect(audienceText({ isPublic: false, roles: [] })).toBe("—");
  });

  it("should read checked roles without duplicates and the public box from the form", () => {
    const form = new FormData();
    form.append("roles", "a");
    form.append("roles", "a");
    form.append("roles", "b");
    form.append("isPublic", "on");
    expect(audienceFromForm(form)).toEqual({
      roles: ["a", "b"],
      isPublic: true,
    });
    expect(audienceFromForm(new FormData())).toEqual({
      roles: [],
      isPublic: false,
    });
  });
});

describe("parsers", () => {
  it("should fall back to safe defaults for unknown values", () => {
    expect(parseManageTab("sections")).toBe("sections");
    expect(parseManageTab("x")).toBe("items");
    expect(parseStatusFilter("draft")).toBe("draft");
    expect(parseStatusFilter("other")).toBeNull();
    expect(parseQuery("  Γύρισμα ")).toBe("Γύρισμα");
    expect(parseQuery(undefined)).toBe("");
    expect(parseQuery("x".repeat(300))).toHaveLength(200);
  });
});
