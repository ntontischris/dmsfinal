import { describe, expect, it } from "vitest";

import type { CrewMember, EquipmentLine, FilmingCard } from "../types";
import {
  hasOpenRequest,
  isCrewStepOf,
  offerLineOf,
  pastWarningOf,
  templateGapOf,
} from "./e3-guide-model";

const NOW = Date.parse("2026-11-15T09:00:00Z");

const memberOf = (userId: string, name: string, isBlocked = false): CrewMember => ({
  userId,
  name,
  response: "pending" as CrewMember["response"],
  reason: null,
  respondedAt: null,
  version: null,
  isBlocked,
});

const lineOf = (itemId: string, name: string): EquipmentLine => ({
  itemId,
  name,
  status: "available",
  conflict: false,
});

const crewTemplates = [
  {
    name: "Podcast",
    members: [
      { id: "u1", name: "Άννα" },
      { id: "u2", name: "Νίκος" },
      { id: "u3", name: "Μαρία" },
    ],
  },
];

const equipmentTemplates = [
  {
    name: "Podcast κιτ",
    items: [
      { id: "i1", name: "Κάμερα Α", status: "available" },
      { id: "i2", name: "Μικρόφωνο", status: "available" },
      { id: "i3", name: "Φώτα", status: "repair" },
    ],
  },
];

const gapOf = (crew: CrewMember[], equipment: EquipmentLine[]) =>
  templateGapOf({
    card: { crew, equipment, kind: null },
    crewTemplates,
    equipmentTemplates,
    candidateIds: ["u1", "u2"],
    statusLabels: { repair: "Σε επισκευή" },
  });

describe("templateGapOf", () => {
  it("should name who and what did not go in, and why", () => {
    const gap = gapOf([memberOf("u1", "Άννα")], [lineOf("i1", "Κάμερα Α")]);
    expect(gap.crewTemplate).toBe("Podcast");
    expect(gap.crew).toEqual([
      { name: "Νίκος", reason: "έχει άλλο Γύρισμα αυτή την ώρα" },
      { name: "Μαρία", reason: "δεν είναι πια ενεργό μέλος της ομάδας" },
    ]);
    expect(gap.items).toEqual([
      {
        name: "Μικρόφωνο",
        reason: "είναι δεσμευμένο σε άλλο Γύρισμα αυτή την ώρα",
      },
      { name: "Φώτα", reason: "δεν είναι διαθέσιμο (Σε επισκευή)" },
    ]);
  });

  it("should be empty when everything went in, and warn about days off", () => {
    const gap = gapOf(
      [memberOf("u1", "Άννα", true), memberOf("u2", "Νίκος"), memberOf("u3", "Μαρία")],
      [lineOf("i1", "Κάμερα Α"), lineOf("i2", "Μικρόφωνο"), lineOf("i3", "Φώτα")],
    );
    expect(gap.crew).toEqual([]);
    expect(gap.items).toEqual([]);
    expect(gap.blocked).toEqual(["Άννα"]);
  });

  it("should say there is no template when none exists", () => {
    const gap = templateGapOf({
      card: { crew: [], equipment: [], kind: null },
      crewTemplates: [],
      equipmentTemplates: [],
      candidateIds: [],
      statusLabels: {},
    });
    expect([gap.crewTemplate, gap.equipmentTemplate]).toEqual([null, null]);
  });
});

type RequestCard = Pick<FilmingCard, "state" | "startsAt" | "signals" | "cancelRequest">;

const cardOf = (over: Partial<RequestCard> = {}): RequestCard => ({
  state: "pending",
  startsAt: "2026-11-20T08:00:00Z",
  signals: { pendingReschedule: null, slotProblem: null } as FilmingCard["signals"],
  cancelRequest: null,
  ...over,
});

describe("pastWarningOf", () => {
  it("should warn when the requested day has passed", () => {
    expect(
      pastWarningOf(cardOf({ startsAt: "2026-11-07T08:00:00Z" }), NOW),
    ).toContain("έχει ήδη περάσει");
  });

  it("should warn when the requested new time has passed", () => {
    const card = cardOf({
      state: "scheduled",
      signals: {
        pendingReschedule: { startsAt: "2026-11-10T08:00:00Z" },
        slotProblem: null,
      } as unknown as FilmingCard["signals"],
    });
    expect(pastWarningOf(card, NOW)).toContain("Η νέα ώρα που ζητήθηκε");
  });

  it("should stay quiet for a future request", () => {
    expect(pastWarningOf(cardOf(), NOW)).toBeNull();
  });
});

describe("hasOpenRequest", () => {
  it("should see a booking, a reschedule and a cancellation request", () => {
    expect(hasOpenRequest(cardOf())).toBe(true);
    expect(
      hasOpenRequest(
        cardOf({ state: "scheduled", cancelRequest: { at: "x", reason: "y" } }),
      ),
    ).toBe(true);
    expect(hasOpenRequest(cardOf({ state: "scheduled" }))).toBe(false);
  });
});

describe("isCrewStepOf", () => {
  it("should find the crew step in both guides", () => {
    expect(isCrewStepOf({ job: "egkrino-gyrismata", step: 2 })).toBe(true);
    expect(isCrewStepOf({ job: "stino-gyrisma", step: 3 })).toBe(true);
    expect(isCrewStepOf({ job: "egkrino-gyrismata", step: 3 })).toBe(false);
    expect(isCrewStepOf(null)).toBe(false);
  });
});

describe("offerLineOf", () => {
  it("should say how many were sent and how many are still free", () => {
    const offer = { offered: 3, times: ["a", "b"], offeredAt: "2026-11-15T08:00:00Z" };
    expect(offerLineOf(offer)).toContain("Στάλθηκαν 3 ώρες");
    expect(offerLineOf(offer)).toContain("ελεύθερες ακόμα: 2");
    expect(offerLineOf({ ...offer, times: [] })).toContain("καμία δεν είναι πια ελεύθερη");
  });
});
