import { describe, expect, it } from "vitest";

import type { ActivityLookups, ActivityRow } from "../types";
import { canChangeActivity, toActivityRows } from "./activity-rows";

const NOW = Date.parse("2026-11-06T12:00:00Z");
const HOUR = 3_600_000;

const activity = (over: Partial<ActivityRow> = {}): ActivityRow => ({
  id: "a1",
  opportunityId: null,
  opportunityTitle: null,
  occurredAt: "2026-11-04T08:30:00Z",
  createdAt: new Date(NOW - HOUR).toISOString(),
  isEdited: false,
  actorId: "u1",
  actorName: "Άννα",
  kindId: "k1",
  event: null,
  body: "Του τηλεφώνησα",
  previousId: null,
  subjectId: null,
  ...over,
});

const seller = { userId: "u1", isOwner: false, canManage: true };
const owner = { userId: "u9", isOwner: true, canManage: true };

const LOOKUPS: ActivityLookups = {
  stages: {},
  kinds: { k1: "Κλήση" },
  lossReasons: {},
  users: {},
};

describe("canChangeActivity", () => {
  it("η συντάκτρια διορθώνει μέσα σε 24 ώρες από την καταγραφή", () => {
    expect(canChangeActivity(activity(), seller, NOW)).toBe(true);
    expect(
      canChangeActivity(
        activity({ createdAt: new Date(NOW - 25 * HOUR).toISOString() }),
        seller,
        NOW,
      ),
    ).toBe(false);
  });

  it("άλλος Χρήστης όχι, ο Ιδιοκτήτης πάντα", () => {
    expect(canChangeActivity(activity({ actorId: "u2" }), seller, NOW)).toBe(
      false,
    );
    expect(
      canChangeActivity(
        activity({ createdAt: "2025-01-01T00:00:00Z" }),
        owner,
        NOW,
      ),
    ).toBe(true);
  });

  it("η αυτόματη Δραστηριότητα δεν αλλάζει ποτέ", () => {
    expect(
      canChangeActivity(
        activity({ kindId: null, event: "created" }),
        owner,
        NOW,
      ),
    ).toBe(false);
  });
});

describe("toActivityRows", () => {
  it("δείχνει ώρα Αθήνας, είδος, διόρθωση και την Ευκαιρία όταν ζητηθεί", () => {
    const [row] = toActivityRows(
      [
        activity({
          opportunityId: "o1",
          opportunityTitle: "Βίντεο",
          isEdited: true,
        }),
      ],
      LOOKUPS,
      { who: seller, now: NOW, showOpportunity: true },
    );
    expect(row).toMatchObject({
      when: "04/11/2026, 10:30",
      kind: "Κλήση · διορθώθηκε",
      text: "Του τηλεφώνησα (Βίντεο)",
      by: "Άννα",
      canChange: true,
      occurredLocal: "2026-11-04T10:30",
    });
  });

  it("Δραστηριότητα του Πελάτη γράφεται χωρίς Ευκαιρία", () => {
    const [row] = toActivityRows([activity()], LOOKUPS, {
      who: seller,
      now: NOW,
      showOpportunity: true,
    });
    expect(row.text).toBe("Του τηλεφώνησα");
  });
});
