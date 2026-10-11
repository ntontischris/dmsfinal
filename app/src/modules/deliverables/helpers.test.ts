import { describe, expect, it } from "vitest";

import type { DeliverableCan, DeliverableCard } from "./types";
import {
  availableActions,
  deadlineText,
  parseQueueView,
  queueViewsOf,
  signalsOf,
} from "./helpers";
import { cardFactory, canFactory } from "./test-factories";

describe("availableActions", () => {
  it("should show nothing to a viewer with no rights on the deliverable", () => {
    expect(availableActions(canFactory(), 0)).toEqual([]);
  });

  it("should show the internal approval only when the viewer may approve", () => {
    const can = canFactory({ approveInternal: true });
    expect(availableActions(can, 1)).toEqual(["approveInternal"]);
  });

  it("should offer the link fix only once a version exists", () => {
    const can = canFactory({ edit: true });
    expect(availableActions(can, 0)).toEqual(["edit"]);
    expect(availableActions(can, 2)).toEqual(["fixLink", "edit"]);
  });

  it("should keep the order of the form: add, send, return, approve, fix, cancel, edit", () => {
    const all: DeliverableCan = {
      addVersion: true,
      send: true,
      return: true,
      approveInternal: true,
      cancel: true,
      comment: true,
      decideCharge: true,
      edit: true,
    };
    expect(availableActions(all, 1)).toEqual([
      "addVersion",
      "send",
      "return",
      "approveInternal",
      "fixLink",
      "cancel",
      "edit",
    ]);
  });
});

describe("queue views", () => {
  it("should show the review tab only to a reviewer", () => {
    expect(queueViewsOf(false)).toEqual(["mine", "client"]);
    expect(queueViewsOf(true)).toEqual(["mine", "review", "client"]);
  });

  it("should fall back to the first visible tab for an unknown or hidden view", () => {
    const views = queueViewsOf(false);
    expect(parseQueueView("review", views)).toBe("mine");
    expect(parseQueueView("nonsense", views)).toBe("mine");
    expect(parseQueueView("client", views)).toBe("client");
  });
});

describe("signalsOf", () => {
  it("should raise the late, over-limit and broken-link signals", () => {
    const card: DeliverableCard = cardFactory({ isLate: true, overLimit: true, linkBroken: true });
    expect(signalsOf(card).map((signal) => signal.label)).toEqual([
      "Καθυστερεί",
      "Πάνω από το όριο",
      "Το link δεν ανοίγει",
    ]);
  });

  it("should raise no signal for a healthy deliverable", () => {
    expect(signalsOf(cardFactory())).toEqual([]);
  });
});

describe("deadlineText", () => {
  it("should write the date as day/month/year", () => {
    expect(deadlineText("2027-03-10")).toBe("10/03/2027");
    expect(deadlineText(null)).toBe("");
  });
});
