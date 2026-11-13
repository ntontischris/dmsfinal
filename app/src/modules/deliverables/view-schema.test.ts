import { describe, expect, it } from "vitest";

import { deliverableCardSchema, deliverableDetailSchema } from "./view-schema";

const card = {
  id: "11111111-1111-4111-8111-111111111111",
  title: "Reel",
  productionId: "22222222-2222-4222-8222-222222222222",
  production: "Μάρτιος",
  client: null,
  kind: "Reel",
  kindId: "33333333-3333-4333-8333-333333333333",
  assigneeId: null,
  assigneeName: null,
  filmingId: null,
  deadline: null,
  isLate: false,
  state: "in_review",
  daysWaiting: 0,
  overLimit: false,
  linkBroken: false,
  versionCount: 1,
  roundsUsed: 0,
  roundsLimit: 2,
  charge: "included",
  chargeReason: null,
  approvedAt: null,
  cancelledAt: null,
  cancelReason: null,
  cancelOutcome: null,
};

const version = {
  number: 1,
  url: "https://drive.google.com/file/d/abc",
  host: "drive.google.com",
  state: "in_review",
  note: null,
  reviewNote: null,
  createdAt: "2026-10-11T07:00:00+00:00",
  sentAt: null,
  answeredAt: null,
  answerNote: null,
  linkBroken: false,
  comments: [],
};

const detail = {
  ...card,
  versions: [version],
  can: {
    addVersion: true,
    send: false,
    return: true,
    approveInternal: true,
    cancel: true,
    comment: true,
    decideCharge: false,
    edit: true,
    decideRoundCharge: false,
  },
  pendingCharge: false,
  history: [],
  requests: [],
  roundCharges: [],
  finalFilesUrl: null,
};

describe("deliverableCardSchema", () => {
  it("should refuse a card with a state the database does not send", () => {
    expect(deliverableCardSchema.safeParse({ ...card, state: "lost" }).success).toBe(false);
  });
});

describe("deliverableDetailSchema", () => {
  it("should read a version with an https link", () => {
    expect(deliverableDetailSchema.safeParse(detail).success).toBe(true);
  });

  it("should refuse a version whose link is not https", () => {
    const plain = { ...detail, versions: [{ ...version, url: "http://drive.google.com/x" }] };
    expect(deliverableDetailSchema.safeParse(plain).success).toBe(false);
  });

  it("should read an open request after approval", () => {
    const parsed = deliverableDetailSchema.parse({
      ...detail,
      requests: [
        {
          id: "66666666-6666-4666-8666-666666666666",
          body: "Άλλαξε το τέλος",
          createdAt: "2026-10-11T07:00:00+00:00",
          createdByName: "Νίκος",
          decision: null,
          decidedAt: null,
          decidedByName: null,
          decisionNote: null,
          newDeliverableId: null,
        },
      ],
    });
    expect(parsed.requests[0]).toMatchObject({ decision: null, createdByName: "Νίκος" });
  });

  it("should read a note thread and a round over the limit", () => {
    const parsed = deliverableDetailSchema.parse({
      ...detail,
      versions: [
        {
          ...version,
          comments: [
            {
              id: "c1",
              body: "Πιο σύντομο",
              atSeconds: 12,
              isInternal: false,
              createdAt: "2026-10-11T07:00:00+00:00",
              authorName: null,
              parentId: null,
              resolvedAt: "2026-10-12T07:00:00+00:00",
              resolvedByName: "Γιώργος",
              seenBy: ["Γιώργος"],
            },
          ],
        },
      ],
      roundCharges: [
        {
          id: "g1",
          version: 3,
          round: 3,
          roundsLimit: 2,
          decision: null,
          reason: null,
          decidedAt: null,
          decidedByName: null,
          createdAt: "2026-10-12T07:00:00+00:00",
        },
      ],
    });
    expect(parsed.versions[0]?.comments[0]).toMatchObject({ seenBy: ["Γιώργος"], resolvedByName: "Γιώργος" });
    expect(parsed.roundCharges[0]).toMatchObject({ round: 3, roundsLimit: 2, decision: null });
  });

  it("should refuse a round decision the database does not send", () => {
    const bad = {
      ...detail,
      roundCharges: [
        {
          id: "g1", version: 3, round: 3, roundsLimit: 2, decision: "maybe", reason: null,
          decidedAt: null, decidedByName: null, createdAt: "2026-10-12T07:00:00+00:00",
        },
      ],
    };
    expect(deliverableDetailSchema.safeParse(bad).success).toBe(false);
  });

  it("should camelize the history of the trail", () => {
    const parsed = deliverableDetailSchema.parse({
      ...detail,
      history: [
        {
          at: "2026-10-11T07:00:00+00:00",
          action: "insert",
          entity: "deliverables",
          actor_name: "Γιώργος",
          before: null,
          after: { title: "Reel" },
        },
      ],
    });
    expect(parsed.history[0]).toMatchObject({ actorName: "Γιώργος", entity: "deliverables" });
  });
});
