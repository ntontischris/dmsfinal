import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { PULL_INTERVAL_MS, runGoogleWorker, shouldPull } from "./worker";
import { fakeApi, fakeClient } from "./test-support";
import type { GoogleState } from "./schemas";

const LAST_SYNC = Date.parse("2026-10-11T10:00:00Z");

const STATE: GoogleState = {
  calendarId: "cal-1",
  sharedWith: "owner@example.com",
  syncToken: "sync-1",
  channelId: "ch-1",
  channelResourceId: "res-1",
  channelExpiresAt: new Date(LAST_SYNC + 7 * 86_400_000).toISOString(),
  lastSyncAt: new Date(LAST_SYNC).toISOString(),
  lastError: null,
  lastErrorAt: null,
  newEvent: "blocked",
  deleteHours: 24,
  writePending: true,
};

const replies = (state: Partial<GoogleState> = {}) => ({
  google_state: () => ({ ...STATE, ...state }),
  google_outbox_claim: () => [],
  google_expire_deletions: () => 0,
});

const OPTIONS = {
  origin: "https://app.example",
  forcePull: false,
  budgetMs: 50_000,
};

beforeEach(() => {
  vi.stubEnv("GOOGLE_SERVICE_ACCOUNT_EMAIL", "svc@example.iam");
  vi.stubEnv("GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY", "not-a-real-key");
  vi.spyOn(console, "error").mockImplementation(() => undefined);
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});

describe("runGoogleWorker", () => {
  it("makes no RPC and no Google call when the account is not configured", async () => {
    vi.stubEnv("GOOGLE_SERVICE_ACCOUNT_EMAIL", "");
    const { client, calls } = fakeClient(replies());
    const api = fakeApi();
    expect(await runGoogleWorker(client, api, OPTIONS)).toMatchObject({
      skipped: "not-configured",
    });
    expect(calls).toHaveLength(0);
    expect(api.listChanges).not.toHaveBeenCalled();
  });

  it("skips when no calendar exists yet", async () => {
    const { client } = fakeClient(replies({ calendarId: null }));
    expect(await runGoogleWorker(client, fakeApi(), OPTIONS)).toMatchObject({
      skipped: "no-calendar",
    });
  });

  it("waits for the 15 minute interval before pulling again, unless forced", () => {
    expect(shouldPull(STATE, false, LAST_SYNC + PULL_INTERVAL_MS - 1000)).toBe(
      false,
    );
    expect(shouldPull(STATE, false, LAST_SYNC + PULL_INTERVAL_MS)).toBe(true);
    expect(shouldPull(STATE, true, LAST_SYNC + 1000)).toBe(true);
  });
});
