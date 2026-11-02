import { describe, expect, it } from "vitest";

import type { HealthJob, HealthView } from "../schemas";
import { p2BannerTitle, p2ModelOf } from "./p2-adapter";

const job = (overrides: Partial<HealthJob> = {}): HealthJob => ({
  job: "outbox",
  label: "Ουρά email και Αυτοματισμοί",
  schedule: "κάθε λεπτό",
  lastOkAt: null,
  lastErrorAt: null,
  lastError: null,
  state: "ok",
  ...overrides,
});

const view = (overrides: Partial<HealthView> = {}): HealthView => ({
  now: "2026-03-01T10:05:00Z",
  attention: 0,
  jobs: [job()],
  sends: { items: [], total: 0 },
  google: {
    connected: true,
    lastSyncAt: null,
    errorSince: null,
    reason: null,
    stopped: false,
    pendingWrites: 2,
  },
  events: { stuck: [], stuckTotal: 0, waiting: 0 },
  ai: {
    month: "2026-03",
    spentMicros: 12_500_000,
    capMicros: 50_000_000,
    publicShare: 80,
    alert: false,
  },
  ...overrides,
});

describe("p2BannerTitle", () => {
  it("should use the prototype wording", () => {
    expect(p2BannerTitle(0)).toBe("Όλα λειτουργούν");
    expect(p2BannerTitle(1)).toBe("1 θέλει προσοχή");
    expect(p2BannerTitle(3)).toBe("3 θέλουν προσοχή");
  });
});

describe("p2ModelOf", () => {
  it("should map a late job to a highlighted red row with its last error", () => {
    const model = p2ModelOf(
      view({ jobs: [job({ state: "late", lastError: "timeout" })] }),
    );
    expect(model.isJobsRed).toBe(true);
    expect(model.jobs[0]).toMatchObject({
      name: "Ουρά email και Αυτοματισμοί",
      isLate: true,
      error: "timeout",
      badge: { label: "άργησε", tone: "attention" },
    });
    expect(model.jobs[0]?.sub).toBe(
      "Τελευταία επιτυχία: — · Πότε τρέχει: κάθε λεπτό",
    );
  });

  it("should show the email beside the recipient only when it differs", () => {
    const send = {
      id: "s1",
      what: "Τιμολόγιο",
      at: "bad-date",
      recipient: "Άννα",
      email: "anna@example.com",
      reason: "bounce",
      retryRef: null,
    };
    const model = p2ModelOf(view({ sends: { items: [send], total: 3 } }));
    expect(model.sends[0]).toEqual({
      id: "s1",
      title: "«Τιμολόγιο» προς Άννα (anna@example.com)",
      sub: "— · λόγος: bounce",
      retryRef: null,
    });
    expect(model.sendsMore).toBe(
      "Φαίνονται 1 από 3. Όλες είναι στο Ιστορικό αποστολών.",
    );
  });

  it("should mark Google red only when the sync stopped", () => {
    const stopped = p2ModelOf(
      view({
        google: { ...view().google, stopped: true, reason: "token έληξε" },
      }),
    );
    expect(stopped.google).toMatchObject({
      isRed: true,
      reason: "token έληξε",
    });
    expect(p2ModelOf(view()).google.isRed).toBe(false);
  });

  it("should turn the AI micros into dollars and a closed cap into closed", () => {
    const model = p2ModelOf(view());
    expect(model.ai).toMatchObject({
      isClosed: false,
      usedDollars: 13,
      capDollars: 50,
    });
    expect(model.ai.text).toContain("(25%)");
    expect(
      p2ModelOf(view({ ai: { ...view().ai, capMicros: 0 } })).ai.isClosed,
    ).toBe(true);
  });

  it("should count waiting events as red", () => {
    const model = p2ModelOf(
      view({ events: { stuck: [], stuckTotal: 0, waiting: 4 } }),
    );
    expect(model.isEventsRed).toBe(true);
    expect(model.eventsWaiting).toBe(
      "4 Γεγονότα περιμένουν πάνω από 15 λεπτά να επεξεργαστούν.",
    );
  });
});
