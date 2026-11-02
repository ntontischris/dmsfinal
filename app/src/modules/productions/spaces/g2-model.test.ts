import { describe, expect, test } from "vitest";

import type { DeliverableCard } from "@/modules/deliverables";

import type {
  ProductionDetail,
  ProductionFilming,
  ProductionTask,
} from "../types";
import {
  cancellationOf,
  deliverableLineOf,
  deliveryBlockers,
  deliveryOf,
  memberRowsOf,
  productionStats,
  provisionRowsOf,
  provisionSub,
  taskSummary,
} from "./g2-model";

const OWNER = "00000000-0000-4000-8000-000000000001";
const ANNA = "00000000-0000-4000-8000-000000000002";
const NIKOS = "00000000-0000-4000-8000-000000000003";

const deliverable = (
  overrides: Partial<DeliverableCard> = {},
): DeliverableCard => ({
  id: "d1",
  title: "Reel 1",
  productionId: "p1",
  production: "Κυψέλη — Οκτώβριος",
  client: "Κυψέλη",
  kind: "Reel",
  kindId: "k1",
  assigneeId: ANNA,
  assigneeName: "Άννα",
  filmingId: null,
  deadline: "2026-11-10",
  isLate: false,
  state: "awaiting_client",
  daysWaiting: 2,
  overLimit: false,
  linkBroken: false,
  versionCount: 2,
  roundsUsed: 1,
  roundsLimit: 2,
  charge: "included",
  chargeReason: null,
  approvedAt: null,
  cancelledAt: null,
  cancelReason: null,
  cancelOutcome: null,
  ...overrides,
});

const filming = (state: string): ProductionFilming => ({
  id: `f-${state}`,
  startsAt: "2026-11-05T08:00:00Z",
  hours: 2,
  state,
  isExtra: false,
  kind: "Γύρισμα",
});

const task = (overrides: Partial<ProductionTask> = {}): ProductionTask => ({
  id: "t1",
  title: "Μουσική",
  assigneeId: ANNA,
  assigneeName: "Άννα",
  dueDate: null,
  isLate: false,
  done: false,
  ...overrides,
});

const detail = (
  overrides: Partial<ProductionDetail> = {},
): ProductionDetail => ({
  id: "p1",
  title: "Κυψέλη — Οκτώβριος",
  client: { id: "c1", name: "Κυψέλη" },
  period: { n: 1, starts: "2026-10-01", ends: "2026-10-31", state: "current" },
  owner: { id: OWNER, name: "Μαρία" },
  state: "open",
  isInternal: false,
  agreement: { id: "a1", title: "Social A", kind: "monthly" },
  balances: [],
  deliveredAt: null,
  deliveredNote: null,
  cancelledAt: null,
  cancelledReason: null,
  members: [],
  history: [],
  viewerCan: {
    deliver: true,
    reopen: false,
    cancel: false,
    transfer: true,
    members: true,
  },
  filmings: [],
  deliverables: [],
  tasks: [],
  autoDelivered: false,
  ...overrides,
});

describe("λωρίδα", () => {
  test("Παραδοτέα ως εγκεκριμένα/σύνολο, χωρίς τα ακυρωμένα", () => {
    const stats = productionStats(
      detail({
        deliverables: [
          deliverable({ state: "approved" }),
          deliverable({ id: "d2" }),
          deliverable({ id: "d3", state: "cancelled" }),
        ],
        filmings: [filming("done")],
        tasks: [task(), task({ id: "t2", done: true })],
      }),
    );
    expect(stats.map((stat) => [stat.label, stat.value])).toEqual([
      ["Παραδοτέα", "1/2"],
      ["Γυρίσματα", "1"],
      ["Ανοιχτές εργασίες", "1"],
    ]);
  });
});

describe("τι λείπει για την αυτόματη παράδοση", () => {
  test("χωρίς Παραδοτέο", () => {
    expect(deliveryBlockers(detail())).toEqual(["δεν υπάρχει ακόμα Παραδοτέο"]);
  });

  test("Παραδοτέα χωρίς έγκριση και ανοιχτά Γυρίσματα", () => {
    const blockers = deliveryBlockers(
      detail({
        deliverables: [
          deliverable(),
          deliverable({ id: "d2", state: "approved" }),
        ],
        filmings: [filming("scheduled"), filming("pending"), filming("done")],
      }),
    );
    expect(blockers).toEqual([
      "1 Παραδοτέα δεν έχουν εγκριθεί",
      "2 ανοιχτά Γυρίσματα",
    ]);
  });

  test("όλα εγκρίθηκαν: δεν λείπει τίποτα", () => {
    expect(
      deliveryBlockers(
        detail({ deliverables: [deliverable({ state: "approved" })] }),
      ),
    ).toEqual([]);
  });
});

describe("Μέλη", () => {
  test("ο Υπεύθυνος πρώτος, ο λόγος από το Ίχνος, οι ανοιχτές αναθέσεις μετρούν Εργασίες και Παραδοτέα", () => {
    const rows = memberRowsOf(
      detail({
        members: [
          { userId: ANNA, name: "Άννα" },
          { userId: NIKOS, name: "Νίκος" },
        ],
        history: [
          {
            at: "2026-10-03T10:00:00Z",
            action: "event",
            event: "member_added",
            actorName: "Μαρία",
            before: null,
            after: { user_id: ANNA, reason: "assignment" },
          },
          {
            at: "2026-10-02T10:00:00Z",
            action: "event",
            event: "member_added",
            actorName: "Μαρία",
            before: null,
            after: { user_id: NIKOS },
          },
        ],
        tasks: [task(), task({ id: "t2", done: true })],
        deliverables: [
          deliverable(),
          deliverable({ id: "d2", state: "approved" }),
        ],
      }),
    );
    expect(
      rows.map((row) => [row.name, row.reason, row.open, row.isOwner]),
    ).toEqual([
      ["Μαρία", "Υπεύθυνος", 0, true],
      ["Άννα", "από ανάθεση", 2, false],
      ["Νίκος", "με το χέρι", 0, false],
    ]);
  });

  test("χωρίς Υπεύθυνο: μόνο τα Μέλη", () => {
    expect(memberRowsOf(detail({ owner: null }))).toEqual([]);
  });
});

describe("Εργασίες", () => {
  test("σύνοψη: ολοκληρωμένες/σύνολο και ανοιχτές", () => {
    expect(taskSummary([task(), task({ id: "t2", done: true })])).toBe(
      "1/2 ολοκληρώθηκαν · 1 ανοιχτή",
    );
    expect(taskSummary([])).toBe("0/0 ολοκληρώθηκαν · 0 ανοιχτές");
  });
});

describe("Παροχές", () => {
  test("σύνολο = δόθηκαν + μεταφέρθηκαν, απομένουν από τη βάση", () => {
    const [row] = provisionRowsOf([
      {
        kindId: "k1",
        code: null,
        label: "Reel",
        unit: "τεμ.",
        given: 4,
        carried: 1,
        used: 2,
        reserved: 1,
        balance: 2,
      },
    ]);
    expect(row).toMatchObject({ total: 5, used: 2, left: 2 });
    expect(provisionSub(row)).toBe(
      "σύνολο 5 · χρησιμοποιήθηκαν 2 · δεσμεύτηκαν 1 · απομένουν 2",
    );
  });
});

describe("Παραδοτέα", () => {
  test("γραμμή με είδος, ανάθεση, προθεσμία, μέρες στον πελάτη και γύρους", () => {
    const line = deliverableLineOf(deliverable(), false);
    expect(line).toMatchObject({
      lead: "v2",
      state: "αναμένει πελάτη",
      tone: "waiting",
      sub: "Reel · Άννα · προθεσμία 10/11/2026 · 2 μέρες στον πελάτη · γύροι 1/2",
    });
  });

  test("Εσωτερική: χωρίς γύρους· σήματα καθυστέρησης, ελέγχου και χρέωσης", () => {
    const line = deliverableLineOf(
      deliverable({
        state: "in_review",
        isLate: true,
        charge: "pending",
        deadline: null,
      }),
      true,
    );
    expect(line.sub).toBe("Reel · Άννα");
    expect(line.badges.map((badge) => badge.text)).toEqual([
      "καθυστερεί",
      "αναμένει εσωτερικό έλεγχο",
      "έξτρα · να αποφασιστεί χρέωση",
    ]);
  });

  test("ακυρωμένο: ξεθωριασμένο με λόγο και τι έγινε η Παροχή", () => {
    const line = deliverableLineOf(
      deliverable({
        state: "cancelled",
        cancelledAt: "2026-10-20T10:00:00Z",
        cancelReason: "Δεν χρειάζεται.",
        cancelOutcome: "returned",
        versionCount: 0,
      }),
      false,
    );
    expect(line.isFaded).toBe(true);
    expect(line.lead).toBe("—");
    expect(line.sub).toContain(
      "Ακυρώθηκε: Δεν χρειάζεται. Παροχή: επιστρέφει.",
    );
  });
});

describe("κατάσταση", () => {
  test("αυτόματη παράδοση = από το σύστημα, χωρίς σχόλιο", () => {
    const story = deliveryOf(
      detail({
        state: "delivered",
        deliveredAt: "2026-10-31T21:30:00Z",
        deliveredNote: "Αυτόματα: εγκρίθηκαν όλα τα Παραδοτέα",
        autoDelivered: true,
      }),
    );
    expect(story).toEqual({ when: "31/10/2026", by: "σύστημα", text: "" });
  });

  test("χειροκίνητη παράδοση: ποιος, από το Ίχνος", () => {
    const story = deliveryOf(
      detail({
        state: "delivered",
        deliveredAt: "2026-11-01T10:00:00Z",
        deliveredNote: "Στο Drive.",
        history: [
          {
            at: "2026-11-01T10:00:00Z",
            action: "event",
            event: "delivered",
            actorName: "Μαρία",
            before: null,
            after: { note: "Στο Drive." },
          },
        ],
      }),
    );
    expect(story).toEqual({
      when: "01/11/2026",
      by: "Μαρία",
      text: "Στο Drive.",
    });
  });

  test("ανοιχτή: ούτε παράδοση ούτε ακύρωση", () => {
    expect(deliveryOf(detail())).toBeNull();
    expect(cancellationOf(detail())).toBeNull();
  });
});
