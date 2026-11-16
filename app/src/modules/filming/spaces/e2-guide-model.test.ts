import { describe, expect, it } from "vitest";

import type { FilmingQueue, PendingEntry } from "../types";
import {
  ANSWER_LABELS,
  answerTargetOf,
  defaultAnswerOf,
  focusOf,
  freedLineOf,
  lockOf,
  loopRowsOf,
  requestsOf,
  sentLineOf,
  teamLineOf,
  waitHref,
} from "./e2-guide-model";

const NOW = Date.parse("2026-11-15T09:00:00Z");
const production = { id: "pr", title: "Νοέμβριος" };

const pendingOf = (over: Partial<PendingEntry> = {}): PendingEntry => ({
  id: "b1",
  startsAt: "2026-11-20T08:00:00Z",
  hours: 2,
  createdAt: "2026-11-10T09:00:00Z",
  waitingHours: 1,
  waitingLong: false,
  client: { id: "c", name: "Ταβέρνα" },
  production,
  provision: null,
  ...over,
});

const queueOf = (over: Partial<FilmingQueue> = {}): FilmingQueue => ({
  pending: [],
  cancelRequests: [],
  rescheduleRequests: [],
  ...over,
});

const cancelOf = (id: string, requestedAt: string) => ({
  id,
  startsAt: "2026-11-21T08:00:00Z",
  hours: 2,
  requestedAt,
  reason: "αρρώστια",
  client: { id: "c2", name: "Κτήμα" },
  production,
  willBurn: false,
});

const rescheduleOf = (
  id: string,
  requestedAt: string,
  newStartsAt = "2026-11-25T08:00:00Z",
) => ({
  id,
  startsAt: "2026-11-22T08:00:00Z",
  hours: 2,
  newStartsAt,
  newHours: 3,
  requestedAt,
  client: { id: "c3", name: "Ξενοδοχείο" },
  production,
  slotProblem: null,
});

describe("requestsOf", () => {
  it("should list every kind oldest first", () => {
    const requests = requestsOf(
      queueOf({
        pending: [pendingOf({ createdAt: "2026-11-12T09:00:00Z" })],
        cancelRequests: [cancelOf("k1", "2026-11-11T09:00:00Z")],
        rescheduleRequests: [rescheduleOf("r1", "2026-11-13T09:00:00Z")],
      }),
    );
    expect(requests.map((request) => [request.id, request.kind])).toEqual([
      ["k1", "cancel"],
      ["b1", "booking"],
      ["r1", "reschedule"],
    ]);
  });

  it("should keep only the newest request of the same filming and say it replaces the older", () => {
    const requests = requestsOf(
      queueOf({
        cancelRequests: [cancelOf("f1", "2026-11-14T09:00:00Z")],
        rescheduleRequests: [rescheduleOf("f1", "2026-11-12T09:00:00Z")],
      }),
    );
    expect(requests).toHaveLength(1);
    expect(requests[0]).toMatchObject({ kind: "cancel", replaces: true });
  });

  it("should approve the new time of a reschedule", () => {
    const [request] = requestsOf(
      queueOf({
        rescheduleRequests: [rescheduleOf("r1", "2026-11-13T09:00:00Z")],
      }),
    );
    expect(request.startsAt).toBe("2026-11-25T08:00:00Z");
    expect(request.hours).toBe(3);
  });
});

describe("focusOf", () => {
  const requests = requestsOf(
    queueOf({
      pending: [
        pendingOf({ id: "a", createdAt: "2026-11-10T09:00:00Z" }),
        pendingOf({ id: "b", createdAt: "2026-11-11T09:00:00Z" }),
      ],
    }),
  );

  it("should open the request of the URL", () => {
    expect(focusOf(requests, "b")).toMatchObject({
      index: 2,
      total: 2,
      request: { id: "b" },
    });
  });

  it("should open the oldest when the URL has none or an answered one", () => {
    expect(focusOf(requests, null)?.request.id).toBe("a");
    expect(focusOf(requests, "gone")?.request.id).toBe("a");
  });

  it("should be null when nothing waits", () => {
    expect(focusOf([], null)).toBeNull();
  });
});

describe("lockOf", () => {
  const [booking] = requestsOf(queueOf({ pending: [pendingOf()] }));

  it("should not lock a free future time", () => {
    expect(lockOf(booking, NOW, null)).toBeNull();
    expect(defaultAnswerOf(null)).toBe("approve");
  });

  it("should lock a past day and default to offering a time", () => {
    const past = { ...booking, startsAt: "2026-11-07T08:00:00Z" };
    const lock = lockOf(past, NOW, null);
    expect(lock).toContain("έχει ήδη περάσει");
    expect(defaultAnswerOf(lock)).toBe("offer");
  });

  it("should lock a taken time with what took it", () => {
    expect(lockOf(booking, NOW, "Κλεισμένος χρόνος")).toContain(
      "Η ώρα πιάστηκε: Κλεισμένος χρόνος",
    );
  });

  it("should never lock accepting a cancellation", () => {
    const [cancel] = requestsOf(
      queueOf({ cancelRequests: [cancelOf("k", "2026-11-11T09:00:00Z")] }),
    );
    expect(
      lockOf({ ...cancel, startsAt: "2026-11-01T08:00:00Z" }, NOW, "x"),
    ).toBeNull();
  });
});

describe("answers per kind", () => {
  it("should speak the language of a cancellation", () => {
    expect(ANSWER_LABELS.cancel).toEqual({
      approve: "Δέχομαι την ακύρωση",
      offer: "Προτείνω άλλη ώρα αντί για ακύρωση",
      reject: "Αρνούμαι",
    });
    expect(ANSWER_LABELS.booking.approve).toBe("Εγκρίνω");
  });
});

describe("answerTargetOf", () => {
  it("should open the filming crew step after approving a booking", () => {
    expect(
      answerTargetOf({ id: "f", kind: "booking", answer: "approve" }),
    ).toBe("/app/filming/f?job=egkrino-gyrismata&step=2&req=f");
  });

  it("should go to the next request after an approved reschedule that keeps its team", () => {
    expect(
      answerTargetOf({ id: "f", kind: "reschedule", answer: "approve" }),
    ).toBe("/app/filming/queue?job=egkrino-gyrismata&step=1");
    expect(
      answerTargetOf({
        id: "f",
        kind: "reschedule",
        answer: "approve",
        lacksTeam: true,
      }),
    ).toContain("step=2");
  });

  it("should go to the next request after accepting a cancellation", () => {
    expect(answerTargetOf({ id: "f", kind: "cancel", answer: "approve" })).toBe(
      "/app/filming/queue?job=egkrino-gyrismata&step=1",
    );
  });

  it("should open the filming offer step and the reason step", () => {
    expect(answerTargetOf({ id: "f", kind: "cancel", answer: "offer" })).toBe(
      "/app/filming/f?job=egkrino-gyrismata&step=3&req=f",
    );
    expect(answerTargetOf({ id: "f", kind: "booking", answer: "reject" })).toBe(
      "/app/filming/queue?job=egkrino-gyrismata&step=4&req=f",
    );
  });
});

describe("lines", () => {
  it("should name who goes and what they take", () => {
    expect(teamLineOf(["Άννα", "Νίκος"], ["Κάμερα"])).toBe(
      "Πάνε: Άννα, Νίκος · Παίρνουν: Κάμερα",
    );
    expect(teamLineOf([], [])).toBe(
      "Πάνε: κανείς από Πρότυπο · Παίρνουν: τίποτα από Πρότυπο",
    );
  });

  it("should say what a cancellation frees", () => {
    expect(freedLineOf(2, 4, true)).toBe(
      "Θα ελευθερωθούν: 2 άτομα, 4 αντικείμενα, το γεγονός στο Google",
    );
    expect(freedLineOf(1, 0, false)).toBe("Θα ελευθερωθούν: 1 άτομο");
  });
});

describe("⏳3: Στάλθηκαν N ώρες στον Πελάτη", () => {
  it("should carry the count and the client name in the wait URL", () => {
    const href = waitHref(3, "Ταβέρνα");
    const query = new URL(href, "http://x").searchParams;
    expect(href.startsWith("/app?job=egkrino-gyrismata&step=5")).toBe(true);
    expect(sentLineOf(query.get("sent"), query.get("client"))).toBe("Στάλθηκαν 3 ώρες στον Πελάτη «Ταβέρνα»");
  });

  it("should use the singular for one hour and stay generic without a count", () => {
    expect(sentLineOf("1", null)).toBe("Στάλθηκε 1 ώρα στον Πελάτη");
    expect(sentLineOf(null, null)).toBe("Στάλθηκαν οι ώρες στον Πελάτη");
    expect(waitHref(2, null)).not.toContain("client=");
  });
});

describe("loopRowsOf", () => {
  it("should count one row per filming, the same number as the card", () => {
    const requests = requestsOf(
      queueOf({
        pending: [pendingOf({ id: "b1" }), pendingOf({ id: "b2", createdAt: "2026-11-11T09:00:00Z" })],
        cancelRequests: [cancelOf("b1", "2026-11-12T09:00:00Z")],
      }),
    );
    const { rows, count } = loopRowsOf(requests);
    expect(count).toBe(2);
    expect(rows.map((row) => row.key)).toEqual(["b2", "b1"]);
    expect(rows[0].href).toBe("/app/filming/queue?job=egkrino-gyrismata&step=1&req=b2");
  });
});
