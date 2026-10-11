import { describe, expect, it, vi } from "vitest";

import { GoogleApiError } from "./client";
import { pushOutbox } from "./push";
import { fakeApi, fakeClient, type RpcCall } from "./test-support";
import type { ClaimItem } from "./schemas";

const EVENT = {
  summary: "(αναμένει) Ακρόπολη",
  description: "/app/filming/f-1",
  location: "",
  start: "2027-01-05T10:00:00+02:00",
  end: "2027-01-05T13:00:00+02:00",
  allDay: false,
};

const item = (overrides: Partial<ClaimItem>): ClaimItem => ({
  id: 1,
  entity: "filming",
  entityId: "f-1",
  op: "upsert",
  eventId: null,
  event: EVENT,
  ...overrides,
});

function context(items: ClaimItem[], api = fakeApi()) {
  const { client, calls } = fakeClient({ google_outbox_claim: () => items });
  return {
    ctx: { client, api, calendarId: "cal-1", origin: "https://app.example" },
    calls,
  };
}

const doneCalls = (calls: RpcCall[]) =>
  calls
    .filter((call) => call.name === "google_outbox_done")
    .map((call) => call.args);

describe("pushOutbox", () => {
  it("inserts a new event and records its id and etag", async () => {
    const { ctx, calls } = context([item({})]);
    expect(await pushOutbox(ctx)).toBe(1);
    expect(ctx.api.insertEvent).toHaveBeenCalledOnce();
    expect(doneCalls(calls)).toEqual([
      { p_id: 1, p_event_id: "ev-new", p_etag: "etag-new", p_error: null },
    ]);
  });

  it("patches a known event and inserts again when Google says it is gone", async () => {
    const api = fakeApi({
      patchEvent: vi.fn(async () => {
        throw new GoogleApiError(404);
      }),
    });
    const { ctx, calls } = context([item({ eventId: "ev-1" })], api);
    await pushOutbox(ctx);
    expect(api.patchEvent).toHaveBeenCalledOnce();
    expect(api.insertEvent).toHaveBeenCalledOnce();
    expect(doneCalls(calls)[0]).toMatchObject({ p_event_id: "ev-new" });
  });

  it("treats a delete of an event that is already gone as success", async () => {
    const api = fakeApi({ deleteEvent: vi.fn(async () => undefined) });
    const { ctx, calls } = context(
      [item({ op: "delete", eventId: "ev-1", event: null })],
      api,
    );
    await pushOutbox(ctx);
    expect(doneCalls(calls)).toEqual([
      { p_id: 1, p_event_id: null, p_etag: null, p_error: null },
    ]);
  });

  it("finishes without calling Google when the entity no longer exists", async () => {
    const { ctx, calls } = context([item({ event: null })]);
    await pushOutbox(ctx);
    expect(ctx.api.insertEvent).not.toHaveBeenCalled();
    expect(doneCalls(calls)[0]).toMatchObject({ p_error: null });
  });

  it("records only the status code when a write fails", async () => {
    const api = fakeApi({
      insertEvent: vi.fn(async () => {
        throw new GoogleApiError(503);
      }),
    });
    const { ctx, calls } = context([item({})], api);
    await pushOutbox(ctx);
    expect(doneCalls(calls)[0]).toEqual({
      p_id: 1,
      p_event_id: null,
      p_etag: null,
      p_error: "Google 503",
    });
  });
});
