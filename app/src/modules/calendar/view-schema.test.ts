import { describe, expect, it } from "vitest";

import { blockedKindsSchema, calendarViewSchema } from "./view-schema";

// Τα JSON της βάσης όπως τα δίνει το calendar_view για την ομάδα και για τον Πελάτη.
const FILMING = {
  id: "f1",
  startsAt: "2027-01-05T07:00:00Z",
  hours: 2,
  state: "scheduled",
  title: "Κυψέλη",
  isMine: true,
};

const teamJson = {
  filmings: [{ ...FILMING, crewIds: ["u2"] }],
  blocked: [
    {
      id: "b1",
      userId: "u2",
      userName: "Πέτρος",
      startsAt: "2027-01-05T08:00:00Z",
      endsAt: "2027-01-05T09:00:00Z",
      allDay: false,
      title: null,
      isMine: false,
      kindId: "k1",
      kindLabel: "Ραντεβού",
    },
  ],
  busy: [],
  nextSteps: [
    {
      id: "o1",
      day: "2027-01-05",
      step: "Τηλέφωνο",
      opportunityTitle: "Μηνιαίο",
      clientName: "Κυψέλη",
      managerId: null,
      managerName: null,
      isMine: false,
    },
  ],
  deadlines: [
    {
      id: "d1",
      day: "2027-01-06",
      title: "Reel",
      clientName: null,
      assigneeId: null,
      assigneeName: null,
      isMine: false,
    },
  ],
  days: [],
  canBlockOthers: true,
  canBook: true,
  team: [],
  people: [{ userId: "u2", name: "Πέτρος" }],
  me: "u1",
  google: null,
};

describe("calendarViewSchema", () => {
  it("should read the team view with kinds, next steps, deadlines and people", () => {
    const view = calendarViewSchema.parse(teamJson);
    expect(view.isTeam).toBe(true);
    expect(view.blocked[0]?.kindLabel).toBe("Ραντεβού");
    expect(view.blocked[0]?.kindColor).toBeNull();
    expect(view.filmings[0]?.crewIds).toEqual(["u2"]);
    expect(view.nextSteps).toHaveLength(1);
    expect(view.deadlines).toHaveLength(1);
    expect(view.me).toBe("u1");
  });

  it("should give the client no extra layers and filmings without crew", () => {
    const view = calendarViewSchema.parse({
      filmings: [FILMING],
      days: [],
      canBook: false,
      google: null,
    });
    expect(view).toMatchObject({
      isTeam: false,
      nextSteps: [],
      deadlines: [],
      people: [],
      me: null,
    });
    expect(view.filmings[0]?.crewIds).toEqual([]);
  });
});

describe("blockedKindsSchema", () => {
  it("should read the kinds with their retired flag, colour and icon", () => {
    expect(
      blockedKindsSchema.parse([
        { id: "k1", label: "Ρεπό", retired: false, color: "teal", icon: "🌙", becomesFilming: true },
      ]),
    ).toEqual([
      { id: "k1", label: "Ρεπό", retired: false, color: "teal", icon: "🌙", becomesFilming: true },
    ]);
  });

  it("should give a neutral grey kind without icon, not convertible to a filming, when the database has no style yet", () => {
    expect(
      blockedKindsSchema.parse([{ id: "k1", label: "Ρεπό", retired: false }]),
    ).toEqual([
      { id: "k1", label: "Ρεπό", retired: false, color: "grey", icon: null, becomesFilming: false },
    ]);
  });
});
