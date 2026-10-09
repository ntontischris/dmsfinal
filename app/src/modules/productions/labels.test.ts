import { describe, expect, it } from "vitest";

import {
  EVENT_LABELS,
  PERIOD_STATE_LABELS,
  STATE_LABELS,
  TAB_LABELS,
} from "./labels";

describe("labels", () => {
  it("should name every production state in Greek", () => {
    expect(STATE_LABELS).toEqual({
      open: "Ανοιχτή",
      delivered: "Παραδομένη",
      cancelled: "Ακυρωμένη",
    });
  });

  it("should name the three tabs of the list", () => {
    expect(TAB_LABELS).toEqual({
      open: "Ανοιχτές",
      delivered: "Παραδομένες",
      all: "Όλες",
    });
  });

  it("should name every period state in Greek", () => {
    expect(PERIOD_STATE_LABELS).toEqual({
      closed: "κλειστή",
      current: "τρέχουσα",
      next: "επόμενη",
    });
  });

  it("should name each event that the audit trail records", () => {
    expect(Object.keys(EVENT_LABELS).sort()).toEqual(
      [
        "cancelled",
        "created",
        "delivered",
        "member_added",
        "member_removed",
        "owner_transferred",
        "reopened",
      ].sort(),
    );
  });
});
