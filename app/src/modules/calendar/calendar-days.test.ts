import { describe, expect, it } from "vitest";

import { buildCalendarDays } from "./calendar-days";
import type { CalendarData } from "./types";
import type { LayerKey } from "./url-state";

const DAYS = ["2026-10-12", "2026-10-13", "2026-10-14"];

const teamData = (overrides: Partial<CalendarData> = {}): CalendarData => ({
  isTeam: true,
  filmings: [
    { id: "f1", startsAt: "2026-10-12T06:00:00Z", hours: 3, state: "pending", title: "Ακρόπολη", isMine: true, crewIds: [] },
  ],
  blocked: [
    {
      id: "b1",
      userId: "u1",
      userName: "Νίκος",
      startsAt: "2026-10-11T21:00:00Z",
      endsAt: "2026-10-13T21:00:00Z",
      allDay: true,
      title: null,
      isMine: false,
      kindId: null,
      kindLabel: null,
    },
  ],
  busy: [
    { userId: "u2", userName: "Άννα", startsAt: "2026-10-12T07:00:00Z", endsAt: "2026-10-12T09:00:00Z" },
  ],
  nextSteps: [],
  deadlines: [],
  days: [{ day: "2026-10-14", status: "holiday", holidayName: "Αγίου Δημητρίου" }],
  canBlockOthers: false,
  canBook: true,
  team: [],
  people: [],
  me: "me",
  google: null,
  ...overrides,
});

const dayOf = (
  date: string,
  data: CalendarData,
  layers: readonly LayerKey[] = ["filmings", "blocked", "nextSteps", "deadlines", "busy"],
) =>
  buildCalendarDays(data, DAYS, layers).find((day) => day.date === date);

describe("buildCalendarDays", () => {
  it("should place a filming on its Athens day with its time span and pending mark", () => {
    const filming = dayOf("2026-10-12", teamData())?.entries.find((entry) => entry.kind === "filming");
    expect(filming).toMatchObject({
      kind: "filming",
      time: "09:00–12:00",
      title: "Ακρόπολη",
      isPending: true,
      href: "/app/filming/f1",
    });
  });

  it("should show a blocked time on every day it covers, with the name of its owner", () => {
    expect(dayOf("2026-10-12", teamData())?.entries.map((entry) => entry.kind)).toEqual(["blocked", "filming", "busy"]);
    expect(dayOf("2026-10-13", teamData())?.entries[0]).toMatchObject({
      kind: "blocked",
      time: "όλη μέρα",
      title: "Κλεισμένος χρόνος",
      detail: "Νίκος",
      href: null,
    });
  });

  it("should give a link to the blocked time only when the viewer can edit it", () => {
    const own = teamData({
      blocked: [{ id: "b9", userId: "me", userName: "Εγώ", startsAt: "2026-10-12T06:00:00Z", endsAt: "2026-10-12T08:00:00Z", allDay: false, title: "Ιατρείο", isMine: true, kindId: null, kindLabel: null }],
    });
    expect(dayOf("2026-10-12", own)?.entries.find((entry) => entry.kind === "blocked")).toMatchObject({
      href: "/app/calendar/blocked/b9",
      title: "Ιατρείο",
      detail: null,
    });
  });

  it("should show a busy member without title or link", () => {
    expect(dayOf("2026-10-12", teamData())?.entries.find((entry) => entry.kind === "busy")).toMatchObject({
      title: "Απασχολημένος",
      detail: "Άννα",
      time: "10:00–12:00",
      href: null,
    });
  });

  it("should keep only the layers that are on", () => {
    const entries = dayOf("2026-10-12", teamData(), ["busy"])?.entries ?? [];
    expect(entries.map((entry) => entry.kind)).toEqual(["busy"]);
  });

  it("should carry the status and the holiday name of a day", () => {
    expect(dayOf("2026-10-14", teamData())).toMatchObject({ status: "holiday", holidayName: "Αγίου Δημητρίου" });
    expect(dayOf("2026-10-12", teamData())?.status).toBeNull();
  });

  it("should name a blocked time by its kind and keep the kind as a mark", () => {
    const kinded = teamData({
      blocked: [{ id: "b2", userId: "me", userName: "Εγώ", startsAt: "2026-10-12T06:00:00Z", endsAt: "2026-10-12T07:00:00Z", allDay: false, title: null, isMine: true, kindId: "k1", kindLabel: "Ραντεβού" }],
    });
    expect(dayOf("2026-10-12", kinded)?.entries.find((entry) => entry.kind === "blocked")).toMatchObject({
      title: "Ραντεβού",
      mark: "Ραντεβού",
    });
  });

  it("should place a next step and a deadline on their day with a link to their page", () => {
    const data = teamData({
      nextSteps: [{ id: "o1", day: "2026-10-13", step: "Τηλέφωνο", opportunityTitle: "Μηνιαίο", clientName: "Κυψέλη", managerId: "u2", managerName: "Άννα", isMine: false }],
      deadlines: [{ id: "d1", day: "2026-10-13", title: "Reel", clientName: "Κυψέλη", assigneeId: "me", assigneeName: "Εγώ", isMine: true }],
    });
    const entries = dayOf("2026-10-13", data)?.entries ?? [];
    expect(entries.find((entry) => entry.kind === "nextStep")).toMatchObject({
      title: "Επόμενο βήμα: Τηλέφωνο",
      detail: "Κυψέλη · Μηνιαίο · Άννα",
      href: "/app/pipeline/o1",
    });
    expect(entries.find((entry) => entry.kind === "deadline")).toMatchObject({
      title: "Προθεσμία: Reel",
      detail: "Κυψέλη",
      time: "όλη μέρα",
      href: "/app/deliverables/d1",
    });
    expect(dayOf("2026-10-13", data, ["blocked"])?.entries.map((entry) => entry.kind)).toEqual(["blocked"]);
  });
});
