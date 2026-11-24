import { describe, expect, it } from "vitest";

import type { InvoicePayment, TrailEntry } from "./invoice-detail-schema";
import type { Reminder } from "./invoice-reminder-schema";
import { lastReminderText, trailRowsOf } from "./invoice-trail";

const entry = (over: Partial<TrailEntry> = {}): TrailEntry => ({
  at: "2026-03-01T10:00:00+00:00",
  byName: "Γιώργος",
  action: "registered",
  changes: [],
  reason: null,
  ...over,
});

const payment = (over: Partial<InvoicePayment> = {}): InvoicePayment => ({
  receiptId: "r1",
  receivedOn: "2026-04-05",
  methodLabel: "Τραπεζική κατάθεση",
  applied: 500,
  receiptAmount: 500,
  withheld: 0,
  withholdingLabel: null,
  linked: true,
  ...over,
});

const reminder = (over: Partial<Reminder> = {}): Reminder => ({
  at: "2026-03-17T07:00:00+00:00",
  manual: false,
  byName: null,
  recipients: 1,
  ...over,
});

describe("trailRowsOf", () => {
  it("should merge registration, payments and reminders oldest first", () => {
    const rows = trailRowsOf(
      [entry()],
      [payment()],
      [reminder({ at: "2026-04-10T09:00:00+00:00", manual: true, byName: "Άννα" }), reminder()],
    );
    expect(rows.map((row) => row.title)).toEqual([
      "Καταχωρήθηκε",
      "Υπενθύμιση στον Πελάτη (αυτόματη)",
      expect.stringMatching(/^Ήρθε πληρωμή 500/),
      "Υπενθύμιση στον Πελάτη (με το χέρι)",
    ]);
  });

  it("should show who sent a manual reminder and the method of a payment", () => {
    const rows = trailRowsOf([], [payment()], [reminder({ manual: true, byName: "Άννα" })]);
    expect(rows.map((row) => row.meta)).toEqual(["17/03/2026 · Άννα", "05/04/2026 · Τραπεζική κατάθεση"]);
  });

  it("should mark automatic reminders as automatic", () => {
    expect(trailRowsOf([], [], [reminder()])[0]?.meta).toBe("17/03/2026 · αυτόματα");
  });
});

describe("lastReminderText", () => {
  it("should say nothing when no reminder went out", () => {
    expect(lastReminderText([])).toBeNull();
  });

  it("should describe the newest reminder", () => {
    expect(lastReminderText([reminder({ manual: true }), reminder({ at: "2026-03-01T07:00:00+00:00" })])).toBe(
      "Τελευταία υπενθύμιση 17/03/2026 (με το χέρι)",
    );
  });
});
