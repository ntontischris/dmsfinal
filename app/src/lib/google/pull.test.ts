import type { SupabaseClient } from "@supabase/supabase-js";
import { describe, expect, it, vi } from "vitest";

import { GoogleApiError, type ChangesQuery } from "./client";
import { pullChanges, toApplyInput } from "./pull";
import type { GoogleListPage } from "./schemas";
import { fakeApi, fakeClient, rpcNames } from "./test-support";

type ListChanges = (query: ChangesQuery) => Promise<GoogleListPage>;

const FAR_FUTURE_DEADLINE = () => Date.now() + 60_000;
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
    deadline: overrides.deadline ?? FAR_FUTURE_DEADLINE(),
  };
}

describe("pullChanges", () => {
  it("reads every page and stores the sync token only after the last page", async () => {
    const pages: GoogleListPage[] = [
      { items: [changed("a")], nextPageToken: "p2" },
      { items: [changed("b")], nextSyncToken: "sync-new" },
    ];
    const listChanges = vi.fn<ListChanges>(async () => pages.shift()!);
    const { client, calls } = fakeClient(APPLY_REPLY);
    const result = await pullChanges(pullContext(fakeApi({ listChanges }), client, { syncToken: "sync-old" }));
    expect(result).toBe("complete");
    expect(listChanges.mock.calls[1]![0]).toMatchObject({ pageToken: "p2", syncToken: "sync-old" });
    expect(rpcNames(calls).filter((name) => name === "google_apply_change")).toHaveLength(2);
    expect(calls.at(-1)).toEqual({ name: "google_set_sync_token", args: { p_token: "sync-new" } });
  });

  it("does not store a token when the time budget ends before the last page", async () => {
    const listChanges = vi.fn<ListChanges>(async () => ({ items: [changed("a")], nextPageToken: "p2" }));
    const { client, calls } = fakeClient(APPLY_REPLY);
    const context = pullContext(fakeApi({ listChanges }), client, { syncToken: "sync-old", deadline: Date.now() - 1 });
    expect(await pullChanges(context)).toBe("partial");
    expect(listChanges).not.toHaveBeenCalled();
    expect(rpcNames(calls)).not.toContain("google_set_sync_token");
  });

  it("falls back to a full read without a time limit when the sync token has expired", async () => {
    const listChanges = vi
      .fn<ListChanges>()
      .mockRejectedValueOnce(new GoogleApiError(410))
      .mockResolvedValueOnce({ items: [], nextSyncToken: "sync-fresh" });
    const { client } = fakeClient(APPLY_REPLY);
    expect(await pullChanges(pullContext(fakeApi({ listChanges }), client, { syncToken: "sync-old" }))).toBe("complete");
    expect(listChanges.mock.calls[1]![0]).toEqual({ calendarId: "cal-1" });
  });

  it("starts with a full read without a time limit when there is no token yet", async () => {
    const listChanges = vi.fn<ListChanges>(async () => ({ items: [], nextSyncToken: "sync-1" }));
    const { client } = fakeClient(APPLY_REPLY);
    await pullChanges(pullContext(fakeApi({ listChanges }), client));
    expect(listChanges.mock.calls[0]![0]).toEqual({ calendarId: "cal-1" });
  });

  it("records a failing event with its id and keeps the page and the token", async () => {
    const rpc = vi.fn(async (name: string, args: Record<string, unknown> = {}) => {
      const isBad = name === "google_apply_change" && (args.p_event as { id: string }).id === "bad";
      if (isBad) return { data: null, error: { message: "boom" } };
      return { data: name === "google_apply_change" ? { action: "noop" } : null, error: null };
    });
    const client = { rpc } as unknown as SupabaseClient;
    const listChanges = vi.fn<ListChanges>(async () => ({
      items: [changed("bad"), changed("good")],
      nextSyncToken: "sync-new",
    }));
    expect(await pullChanges(pullContext(fakeApi({ listChanges }), client, { syncToken: "sync-old" }))).toBe("complete");
    expect(rpc).toHaveBeenCalledWith("google_note_event_error", { p_event_id: "bad", p_reason: "Google: σφάλμα δικτύου ή σχήματος" });
    expect(rpc.mock.calls.at(-1)).toEqual(["google_set_sync_token", { p_token: "sync-new" }]);
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
