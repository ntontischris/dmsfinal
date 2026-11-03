import { describe, expect, it } from "vitest";

import {
  KIND_COLORS,
  KIND_COLOR_LABELS,
  isKindColor,
  kindToneOf,
} from "./kind-style";
import { kindStyleSchema } from "./schemas";

const ID = "00000000-0000-4000-8000-000000000001";

describe("kind style", () => {
  it("should accept only the palette keys of the design", () => {
    expect(KIND_COLORS).toEqual([
      "teal",
      "green",
      "amber",
      "violet",
      "grey",
      "blue",
      "pink",
      "red",
    ]);
    expect(
      KIND_COLORS.every((color) => KIND_COLOR_LABELS[color].length > 0),
    ).toBe(true);
    expect(isKindColor("teal")).toBe(true);
    expect(isKindColor("magenta")).toBe(false);
    expect(kindToneOf("amber")).toBe("amber");
    expect(kindToneOf("magenta")).toBeNull();
    expect(kindToneOf(null)).toBeNull();
  });

  it("should read a style form with a palette key and a trimmed icon", () => {
    expect(
      kindStyleSchema.parse({ id: ID, color: "violet", icon: " 📞 " }),
    ).toEqual({
      id: ID,
      color: "violet",
      icon: "📞",
    });
    expect(
      kindStyleSchema.parse({ id: ID, color: "grey", icon: "  " }).icon,
    ).toBeNull();
  });

  it("should reject a colour outside the palette and an icon longer than four characters", () => {
    expect(
      kindStyleSchema.safeParse({ id: ID, color: "magenta", icon: "" }).error
        ?.issues[0]?.message,
    ).toBe("Διάλεξε χρώμα από την παλέτα");
    expect(
      kindStyleSchema.safeParse({ id: ID, color: "red", icon: "ΑΒΓΔΕ" }).error
        ?.issues[0]?.message,
    ).toBe("Το εικονίδιο έχει έως 4 χαρακτήρες");
    // Ένα emoji μετρά ως ένας χαρακτήρας, όπως στη βάση (char_length), όχι ως δύο μισά UTF-16.
    expect(
      kindStyleSchema.safeParse({ id: ID, color: "red", icon: "🎬🎬🎬🎬" })
        .success,
    ).toBe(true);
  });
});
