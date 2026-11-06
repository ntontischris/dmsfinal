import { describe, expect, it } from "vitest";

import {
  closedDayText,
  moveLabel,
  shouldCheckClosedDay,
  toClosedDay,
} from "./closed-day";

const formOf = (entries: Record<string, string>): FormData => {
  const form = new FormData();
  Object.entries(entries).forEach(([key, value]) => form.set(key, value));
  return form;
};

describe("toClosedDay", () => {
  it("φτιάχνει την προειδοποίηση για κλειστή μέρα", () => {
    expect(
      toClosedDay("2027-01-10", {
        closed: true,
        reason: "Κυριακή — κλειστά",
        next_open: "2027-01-11",
      }),
    ).toEqual({
      day: "2027-01-10",
      reason: "Κυριακή — κλειστά",
      nextOpen: "2027-01-11",
    });
  });

  it("δεν προειδοποιεί για ανοιχτή μέρα ή για απάντηση που δεν διαβάζεται", () => {
    expect(
      toClosedDay("2027-01-05", {
        closed: false,
        reason: null,
        next_open: null,
      }),
    ).toBeNull();
    expect(toClosedDay("2027-01-05", null)).toBeNull();
    expect(toClosedDay("2027-01-05", { closed: "yes" })).toBeNull();
  });
});

describe("shouldCheckClosedDay", () => {
  it("ρωτά για νέα ημερομηνία", () => {
    expect(shouldCheckClosedDay(formOf({}), "2027-01-10")).toBe(true);
    expect(
      shouldCheckClosedDay(formOf({ previousDue: "2027-01-09" }), "2027-01-10"),
    ).toBe(true);
  });

  it("δεν ξαναρωτά όταν επιβεβαιώθηκε ή όταν η ημερομηνία δεν άλλαξε", () => {
    expect(
      shouldCheckClosedDay(formOf({ confirmClosedDay: "1" }), "2027-01-10"),
    ).toBe(false);
    expect(
      shouldCheckClosedDay(formOf({ previousDue: "2027-01-10" }), "2027-01-10"),
    ).toBe(false);
  });
});

describe("κείμενα", () => {
  it("λέει την ημερομηνία και τον λόγο", () => {
    expect(
      closedDayText({
        day: "2027-08-15",
        reason: "αργία: Δεκαπενταύγουστος",
        nextOpen: "2027-08-16",
      }),
    ).toBe("Η 15/08/2027 είναι αργία: Δεκαπενταύγουστος.");
    expect(moveLabel("2027-08-16")).toBe("Πήγαινέ το στην 16/08/2027");
  });
});
