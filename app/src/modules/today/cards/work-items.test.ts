import { describe, expect, it } from "vitest";

import type { CardItem } from "../view-schema";
import { formatDay, withDayLabel } from "./work-items";

const item = (overrides: Partial<CardItem>): CardItem => ({
  id: "d1",
  title: "Reel 1",
  subtitle: null,
  at: null,
  urgent: false,
  amountCents: null,
  link: "/app/deliverables/d1",
  ...overrides,
});

describe("formatDay", () => {
  it("should show the Athens day of a midnight-Athens instant", () => {
    expect(formatDay("2026-03-03T22:00:00Z")).toBe("4 Μαρ");
  });

  it("should return an empty label for an invalid date", () => {
    expect(formatDay("όχι ημερομηνία")).toBe("");
  });
});

describe("withDayLabel", () => {
  it("should move the day into the subtitle with the card prefix", () => {
    const [row] = withDayLabel(
      [item({ subtitle: "Πελάτης Ένα", at: "2026-03-03T22:00:00Z" })],
      "προθεσμία",
    );
    expect(row.subtitle).toBe("Πελάτης Ένα · προθεσμία 4 Μαρ");
    expect(row.at).toBeNull();
  });

  it("should keep a row without a date as it is", () => {
    const row = item({ subtitle: "Showreel" });
    expect(withDayLabel([row], "προθεσμία")).toEqual([row]);
  });

  it("should not add a separator when there is no subtitle", () => {
    const [row] = withDayLabel([item({ at: "2026-03-03T22:00:00Z" })], "λήγει");
    expect(row.subtitle).toBe("λήγει 4 Μαρ");
  });
});
