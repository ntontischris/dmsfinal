import { describe, expect, it } from "vitest";

import type { ConnectionStatus } from "@/modules/integrations";

import { healthViewSchema, type HealthJob, type HealthView } from "./schemas";
import {
  aiShare,
  bannerTitle,
  eventsAreRed,
  googleVerdict,
  isFreshSystem,
  jobVerdict,
  jobsAreRed,
} from "./status";

const job = (overrides: Partial<HealthJob> = {}): HealthJob => ({
  job: "outbox",
  label: "Ουρά email και Αυτοματισμοί",
  schedule: "κάθε λεπτό",
  lastOkAt: "2026-03-01T10:00:00Z",
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
    lastSyncAt: "2026-03-01T10:04:00Z",
    errorSince: null,
    lastError: null,
    stopped: false,
    pendingWrites: 0,
  },
  events: { stuck: [], stuckTotal: 0, waiting: 0 },
  ai: {
    month: "2026-03",
    spentMicros: 0,
    capMicros: 30_000_000,
    publicShare: 80,
    alert: false,
  },
  ...overrides,
});

const connection = (
  overrides: Partial<ConnectionStatus> = {},
): ConnectionStatus => ({
  id: "google",
  state: "ok",
  reason: "",
  lastSuccessAt: null,
  usage: null,
  models: [],
  isCheckable: true,
  lastCheck: null,
  ...overrides,
});

describe("bannerTitle", () => {
  it("should say all is working at zero and count otherwise", () => {
    expect(bannerTitle(0)).toBe("Όλα δουλεύουν");
    expect(bannerTitle(1)).toBe("1 θέλει προσοχή");
    expect(bannerTitle(4)).toBe("4 θέλουν προσοχή");
  });
});

describe("jobVerdict", () => {
  it("should map late, never, last error and ok", () => {
    expect(jobVerdict(job({ state: "late" }))).toEqual({
      label: "άργησε",
      tone: "attention",
    });
    expect(jobVerdict(job({ state: "never", lastOkAt: null }))).toEqual({
      label: "δεν έχει τρέξει ακόμα",
      tone: undefined,
    });
    expect(
      jobVerdict(job({ lastErrorAt: "2026-03-01T10:01:00Z", lastError: "x" })),
    ).toEqual({ label: "σφάλμα στο τελευταίο", tone: "strong" });
    expect(jobVerdict(job())).toEqual({ label: "έτρεξε", tone: "ok" });
  });

  it("should make the jobs section red only for a late job", () => {
    expect(jobsAreRed(view())).toBe(false);
    expect(jobsAreRed(view({ jobs: [job(), job({ state: "late" })] }))).toBe(
      true,
    );
  });
});

describe("eventsAreRed", () => {
  it("should be red for stuck or long-waiting events", () => {
    expect(eventsAreRed(view())).toBe(false);
    expect(
      eventsAreRed(view({ events: { stuck: [], stuckTotal: 0, waiting: 2 } })),
    ).toBe(true);
    expect(
      eventsAreRed(view({ events: { stuck: [], stuckTotal: 1, waiting: 0 } })),
    ).toBe(true);
  });
});

describe("googleVerdict", () => {
  it("should be red when the database says the sync stopped, with the N5 reason", () => {
    const stopped = view({ google: { ...view().google, stopped: true } });
    expect(
      googleVerdict(stopped, connection({ state: "down", reason: "Λόγος N5" })),
    ).toEqual({
      label: "θέλει προσοχή",
      tone: "attention",
      reason: "Λόγος N5",
    });
    expect(googleVerdict(stopped, null).tone).toBe("attention");
  });

  it("should show not set up, warning and ok from the shared N5 status", () => {
    expect(
      googleVerdict(view(), connection({ state: "not_set_up" })).label,
    ).toBe("δεν έχει στηθεί");
    expect(
      googleVerdict(
        view({ google: { ...view().google, connected: false } }),
        null,
      ).label,
    ).toBe("δεν έχει στηθεί");
    expect(
      googleVerdict(view(), connection({ state: "warning", reason: "Σφάλμα" })),
    ).toEqual({ label: "προσοχή", tone: "strong", reason: "Σφάλμα" });
    expect(googleVerdict(view(), connection()).tone).toBe("ok");
  });
});

describe("aiShare", () => {
  it("should be the spent share of the cap, capped at 1, and 0 when AI is closed", () => {
    expect(
      aiShare({ ...view().ai, spentMicros: 15_000_000, capMicros: 30_000_000 }),
    ).toBe(0.5);
    expect(
      aiShare({ ...view().ai, spentMicros: 40_000_000, capMicros: 30_000_000 }),
    ).toBe(1);
    expect(aiShare({ ...view().ai, capMicros: 0 })).toBe(0);
  });
});

describe("isFreshSystem", () => {
  it("should be fresh only when nothing has run and nothing failed", () => {
    const never = [job({ state: "never", lastOkAt: null })];
    expect(isFreshSystem(view({ jobs: never }))).toBe(true);
    expect(isFreshSystem(view())).toBe(false);
    expect(
      isFreshSystem(view({ jobs: never, sends: { items: [], total: 1 } })),
    ).toBe(false);
  });
});

describe("healthViewSchema", () => {
  it("should accept the database shape and reject an unknown job state", () => {
    expect(healthViewSchema.safeParse(view()).success).toBe(true);
    expect(
      healthViewSchema.safeParse(
        view({ jobs: [{ ...job(), state: "broken" as "ok" }] }),
      ).success,
    ).toBe(false);
  });
});
