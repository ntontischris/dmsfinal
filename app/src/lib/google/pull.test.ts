import { describe, expect, it, vi } from "vitest";

import { GoogleApiError, type ChangesQuery } from "./client";
import type { GoogleListPage } from "./schemas";
import { LOOKBACK_DAYS, pullChanges, toApplyInput } from "./pull";
import { fakeApi, fakeClient, rpcNames } from "./test-support";

type ListChanges = (query: ChangesQuery) => Promise<GoogleListPage>;

const NOW = Date.parse("2026-10-11T10:00:00Z");
const APPLY_REPLY = { google_apply_change: () => ({ action: "noop" }) };

const changed = (id: string) => ({
  id,
  etag: `etag-${id}`,
  status: "confirmed",
});

function pullContext(
  api: ReturnType<typeof fakeApi>,
  client: ReturnType<typeof fakeClient>["client"],
  overrides: { syncToken?: string | null; deadline?: number } = {},
) {
  return {
    client,
    api,
    calendarId: "cal-1",
    syncToken: overrides.syncToken ?? null,
    now: NOW,
    deadline: overrides.deadline ?? Date.now() + 60_000,
  };
}

describe("pullChanges", () => {
  it("reads every page and stores the sync token only after the last page", async () => {
    const pages = [
      { items: [changed("a")], nextPageToken: "p2" },
      { items: [changed("b")], nextSyncToken: "sync-new" },
    ];
    const listChanges = vi.fn<ListChanges>(async () => pages.shift()!);
    const { client, calls } = fakeClient(APPLY_REPLY);
    const result = await pullChanges(
      pullContext(fakeApi({ listChanges }), client, { syncToken: "sync-old" }),
    );
    expect(result).toBe("complete");
    expect(listChanges.mock.calls[1]![0]).toMatchObject({
      pageToken: "p2",
      syncToken: "sync-old",
    });
    expect(
      rpcNames(calls).filter((name) => name === "google_apply_change"),
    ).toHaveLength(2);
    expect(calls.at(-1)).toEqual({
      name: "google_set_sync_token",
      args: { p_token: "sync-new" },
    });
  });

  it("does not store a token when the time budget ends before the last page", async () => {
    const listChanges = vi.fn<ListChanges>(async () => ({
      items: [changed("a")],
      nextPageToken: "p2",
    }));
    const { client, calls } = fakeClient(APPLY_REPLY);
    const context = pullContext(fakeApi({ listChanges }), client, {
      syncToken: "sync-old",
      deadline: Date.now() - 1,
    });
    expect(await pullChanges(context)).toBe("partial");
    expect(listChanges).not.toHaveBeenCalled();
    expect(rpcNames(calls)).not.toContain("google_set_sync_token");
  });

  it("falls back to a full 60-day read when the sync token has expired", async () => {
    const listChanges = vi
      .fn<ListChanges>()
      .mockRejectedValueOnce(new GoogleApiError(410))
      .mockResolvedValueOnce({ items: [], nextSyncToken: "sync-fresh" });
    const { client } = fakeClient(APPLY_REPLY);
    expect(
      await pullChanges(
        pullContext(fakeApi({ listChanges }), client, {
          syncToken: "sync-old",
        }),
      ),
    ).toBe("complete");
    const fullRead = listChanges.mock.calls[1]![0] as {
      timeMin?: string;
      syncToken?: string;
    };
    expect(fullRead.syncToken).toBeUndefined();
    expect(fullRead.timeMin).toBe(
      new Date(NOW - LOOKBACK_DAYS * 86_400_000).toISOString(),
    );
  });

  it("starts with a full read when there is no token yet", async () => {
    const listChanges = vi.fn<ListChanges>(async () => ({
      items: [],
      nextSyncToken: "sync-1",
    }));
    const { client } = fakeClient(APPLY_REPLY);
    await pullChanges(pullContext(fakeApi({ listChanges }), client));
    expect(listChanges.mock.calls[0]![0]).toHaveProperty("timeMin");
  });
});

describe("toApplyInput", () => {
  it("keeps times, attendees and recurrence, and never the Google title", () => {
    const googleEvent = {
      id: "g-1",
      etag: "e-1",
      status: "confirmed",
      summary: "Ιδιωτικό ραντεβού",
      start: { dateTime: "2027-01-05T10:00:00+02:00" },
      end: { dateTime: "2027-01-05T11:00:00+02:00" },
      organizer: { email: "org@example.com" },
      attendees: [{ email: "a@example.com" }, {}],
      recurrence: ["RRULE:FREQ=WEEKLY"],
    };
    const input = toApplyInput(googleEvent);
    expect(input).toEqual({
      id: "g-1",
      status: "confirmed",
      etag: "e-1",
      start: "2027-01-05T10:00:00+02:00",
      end: "2027-01-05T11:00:00+02:00",
      allDay: false,
      attendees: ["a@example.com"],
      organizer: "org@example.com",
      recurring: true,
    });
    expect(input).not.toHaveProperty("summary");
  });
});
