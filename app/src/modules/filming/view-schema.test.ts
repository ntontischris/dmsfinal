import { describe, expect, it } from "vitest";

import { bookingOptionsSchema, queueSchema, settingsViewSchema } from "./view-schema";
import { cardSchema, filmingsViewSchema } from "./view-schema-card";

const FILMING_ID = "11111111-1111-4111-8111-111111111111";
const CLIENT_ID = "22222222-2222-4222-8222-222222222222";
const PRODUCTION_ID = "33333333-3333-4333-8333-333333333333";

const rowJson = {
  id: FILMING_ID,
  startsAt: "2026-10-12T07:00:00+00:00",
  hours: 3,
  state: "scheduled",
  client: { id: CLIENT_ID, name: "Ταβέρνα Αρμύρα" },
  production: { id: PRODUCTION_ID, title: "Οκτώβριος 2026" },
  crew: { confirmed: 1, total: 2 },
  signals: { equipmentConflict: false, isExtra: true, cancelRequest: false, crewDeclined: false },
};

const cardJson = {
  id: FILMING_ID,
  startsAt: "2026-10-12T07:00:00+00:00",
  hours: 3,
  actualHours: null,
  location: null,
  origin: "team",
  state: "scheduled",
  isExtra: false,
  burned: false,
  kind: { id: "44444444-4444-4444-8444-444444444444", label: "Reel", measure: "per_filming" },
  client: { id: CLIENT_ID, name: "Ταβέρνα Αρμύρα" },
  production: { id: PRODUCTION_ID, title: "Οκτώβριος 2026", isInternal: false },
  agreement: null,
  period: { n: 1, starts: "2026-10-01", ends: "2026-10-31", state: "current" },
  clientNote: null,
  internalNote: "Φέρε το gimbal",
  approvedAt: null,
  rejectedAt: null,
  rejectedReason: null,
  cancelledAt: null,
  cancelledSide: null,
  cancelledReason: null,
  cancelRequest: null,
  doneAt: null,
  noShowAt: null,
  provision: null,
  crew: [],
  equipment: [],
  history: [
    {
      at: "2026-10-09T07:00:00+00:00",
      action: "event",
      event: "created",
      actor_name: "Νίκος",
      before: null,
      after: { origin: "team" },
    },
  ],
  signals: { equipmentConflict: false, isExtra: false, cancelRequest: false, crewDeclined: false },
  viewerCan: {
    approve: false,
    reject: false,
    cancel: true,
    reschedule: true,
    markDone: true,
    markNoShow: true,
    undo: false,
    crew: true,
    equipment: true,
    decideCancel: false,
    clientCancel: false,
    requestCancel: false,
  },
};

describe("filmingsViewSchema", () => {
  it("should read the list rows with their crew count and signals", () => {
    const [row] = filmingsViewSchema.parse([rowJson]);
    expect(row?.crew).toEqual({ confirmed: 1, total: 2 });
    expect(row?.signals.isExtra).toBe(true);
  });

  it("should reject a state the database does not know", () => {
    expect(() => filmingsViewSchema.parse([{ ...rowJson, state: "archived" }])).toThrow();
  });
});

describe("cardSchema", () => {
  it("should camelize the history of the filming page", () => {
    const card = cardSchema.parse(cardJson);
    expect(card.history[0]).toEqual({
      at: "2026-10-09T07:00:00+00:00",
      action: "event",
      event: "created",
      actorName: "Νίκος",
      before: null,
      after: { origin: "team" },
    });
  });

  it("should keep the internal note for the team and the permissions of the viewer", () => {
    const card = cardSchema.parse(cardJson);
    expect(card.internalNote).toBe("Φέρε το gimbal");
    expect(card.viewerCan.markDone).toBe(true);
  });
});

describe("queueSchema", () => {
  it("should keep the waiting flag and the balance of a pending entry", () => {
    const queue = queueSchema.parse({
      pending: [
        {
          id: FILMING_ID,
          startsAt: "2026-10-12T07:00:00+00:00",
          hours: 2,
          createdAt: "2026-10-07T07:00:00+00:00",
          waitingHours: 48,
          waitingLong: true,
          client: null,
          production: { id: PRODUCTION_ID, title: "Showreel" },
          provision: {
            given: 2,
            carried: 0,
            used: 1,
            reserved: 0,
            balance: 1,
            kind: { id: "44444444-4444-4444-8444-444444444444", label: "Reel", measure: "per_filming" },
          },
        },
      ],
      cancelRequests: [],
    });
    expect(queue.pending[0]?.waitingLong).toBe(true);
    expect(queue.pending[0]?.provision?.balance).toBe(1);
  });
});

describe("bookingOptionsSchema", () => {
  it("should read an agreement with its kinds and an open period", () => {
    const [option] = bookingOptionsSchema.parse([
      {
        id: "55555555-5555-4555-8555-555555555555",
        title: "Μηνιαίο social",
        kind: "monthly",
        client: { id: CLIENT_ID, name: "Ταβέρνα Αρμύρα" },
        noticeHours: 24,
        cancelHours: 48,
        horizonDays: 60,
        bookingNeedsApproval: true,
        period: { id: "66666666-6666-4666-8666-666666666666", n: 1, starts: "2026-10-01", ends: "2026-10-31" },
        kinds: [
          { id: "44444444-4444-4444-8444-444444444444", label: "Reel", measure: "per_filming", defaultHours: 2, balance: null },
        ],
      },
    ]);
    expect(option?.kinds[0]?.defaultHours).toBe(2);
    expect(option?.period?.n).toBe(1);
  });
});

describe("settingsViewSchema", () => {
  it("should reject an unknown conflict mode", () => {
    expect(() =>
      settingsViewSchema.parse({
        bookingNeedsApproval: true,
        noAnswerAction: "none",
        noAnswerHours: 24,
        horizonDays: 60,
        allowOutsidePeriod: false,
        rescheduleNeedsApproval: true,
        equipmentConflict: "ignore",
        clientSeesEquipment: false,
        sheetSending: "manual",
        changeResetsConfirmations: true,
        doneMarking: "manual",
      }),
    ).toThrow();
  });
});
