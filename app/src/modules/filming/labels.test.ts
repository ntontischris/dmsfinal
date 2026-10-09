import { describe, expect, it } from "vitest";

import { EVENT_LABELS, STATE_LABELS, TAB_LABELS } from "./labels";
import { FILMING_STATES, FILMING_TABS } from "./types";

// Τα γεγονότα είναι όσα γράφει η βάση στο Ίχνος (authz.filming_event).
const DATABASE_EVENTS = [
  "created",
  "booked",
  "approved",
  "rejected",
  "cancelled",
  "cancel_requested",
  "cancel_request_decided",
  "rescheduled",
  "done",
  "no_show",
  "outcome_undone",
  "crew_changed",
  "crew_declined",
  "equipment_changed",
  "equipment_conflict",
];

describe("filming labels", () => {
  it("should name every state the database can store", () => {
    for (const state of FILMING_STATES) expect(STATE_LABELS[state]).not.toBe("");
    expect(STATE_LABELS.pending).toBe("Αναμένει έγκριση");
  });

  it("should name every tab of the list", () => {
    for (const tab of FILMING_TABS) expect(TAB_LABELS[tab]).not.toBe("");
  });

  it("should name every event the database writes to the history", () => {
    for (const event of DATABASE_EVENTS) expect(EVENT_LABELS[event]).toBeDefined();
  });
});
