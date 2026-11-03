import { describe, expect, it } from "vitest";

import { forPerson, personLabel, personOptions } from "./person-filter";
import type { CalendarData } from "./types";

const SPAN = {
  startsAt: "2026-11-03T08:00:00Z",
  endsAt: "2026-11-03T09:00:00Z",
};

const data = (overrides: Partial<CalendarData> = {}): CalendarData => ({
  isTeam: true,
  filmings: [
    {
      id: "f-crew",
      startsAt: SPAN.startsAt,
      hours: 1,
      state: "scheduled",
      title: "Α",
      isMine: false,
      crewIds: ["u2"],
    },
    {
      id: "f-manager",
      startsAt: SPAN.startsAt,
      hours: 1,
      state: "scheduled",
      title: "Β",
      isMine: true,
      crewIds: [],
    },
  ],
  blocked: [
    {
      id: "b-me",
      userId: "me",
      userName: "Εγώ",
      ...SPAN,
      allDay: false,
      title: null,
      isMine: true,
      kindId: null,
      kindLabel: null,
      kindColor: null,
      kindIcon: null,
    },
    {
      id: "b-u2",
      userId: "u2",
      userName: "Άννα",
      ...SPAN,
      allDay: false,
      title: null,
      isMine: false,
      kindId: null,
      kindLabel: null,
      kindColor: null,
      kindIcon: null,
    },
  ],
  busy: [{ userId: "u2", userName: "Άννα", ...SPAN }],
  nextSteps: [
    {
      id: "o-me",
      day: "2026-11-03",
      step: "Τηλέφωνο",
      opportunityTitle: "Χ",
      clientName: "Κ",
      managerId: "me",
      managerName: "Εγώ",
      isMine: true,
    },
  ],
  deadlines: [
    {
      id: "d-u2",
      day: "2026-11-03",
      title: "Reel",
      clientName: "Κ",
      assigneeId: "u2",
      assigneeName: "Άννα",
      isMine: false,
    },
  ],
  days: [],
  canBlockOthers: true,
  canBook: true,
  team: [],
  people: [
    { userId: "me", name: "Εγώ" },
    { userId: "u2", name: "Άννα" },
  ],
  me: "me",
  google: null,
  ...overrides,
});

const idsOf = (view: CalendarData) => ({
  filmings: view.filmings.map((item) => item.id),
  blocked: view.blocked.map((item) => item.id),
  busy: view.busy.length,
  nextSteps: view.nextSteps.map((item) => item.id),
  deadlines: view.deadlines.map((item) => item.id),
});

describe("forPerson", () => {
  it("should keep everything for «Όλοι»", () => {
    expect(forPerson(data(), null)).toEqual(data());
  });

  it("should keep for «Εγώ» what is mine, including filmings I manage without being crew", () => {
    expect(idsOf(forPerson(data(), "me"))).toEqual({
      filmings: ["f-manager"],
      blocked: ["b-me"],
      busy: 0,
      nextSteps: ["o-me"],
      deadlines: [],
    });
  });

  it("should keep for one member their crew, blocked time, busy and assigned deadlines", () => {
    expect(idsOf(forPerson(data(), "u2"))).toEqual({
      filmings: ["f-crew"],
      blocked: ["b-u2"],
      busy: 1,
      nextSteps: [],
      deadlines: ["d-u2"],
    });
  });

  it("should ignore a member who is not in the list", () => {
    expect(forPerson(data(), "stranger")).toEqual(data());
  });
});

describe("personOptions", () => {
  it("should offer «Εγώ», «Όλοι» and the other members", () => {
    const options = personOptions(data().people, "me");
    expect(options.map((option) => option.label)).toEqual([
      "Εγώ",
      "Όλοι",
      "Άννα",
    ]);
    expect(personLabel(options, "u2")).toBe("Άννα");
    expect(personLabel(options, null)).toBe("Όλοι");
  });

  it("should offer nothing to someone who sees only themselves", () => {
    expect(personOptions([], "me")).toEqual([]);
  });
});
