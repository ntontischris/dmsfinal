import { describe, expect, it, vi } from "vitest";

import { GoogleApiError } from "./client";
import { pushOutbox } from "./push";
import { fakeApi, fakeClient, type RpcCall } from "./test-support";
import type { ClaimItem } from "./schemas";

const ENTITY_ID = "7f3c2a10-9b8d-4e5f-8a1b-2c3d4e5f6a7b";
const STABLE_ID = "7f3c2a109b8d4e5f8a1b2c3d4e5f6a7b";
const FAR_FUTURE = () => Date.now() + 60_000;

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
  entityId: ENTITY_ID,
  op: "upsert",
  eventId: null,
  event: EVENT,
  ...overrides,
});

function context(items: ClaimItem[], api = fakeApi(), deadline = FAR_FUTURE()) {
  const { client, calls } = fakeClient({ google_outbox_claim: () => items });
  return {
    ctx: { client, api, calendarId: "cal-1", origin: "https://app.example", deadline },
    calls,
  };
}

const doneCalls = (calls: RpcCall[]) =>
  calls.filter((call) => call.name === "google_outbox_done").map((call) => call.args);

describe("pushOutbox", () => {
  it("inserts a new event with a stable id and records its id and etag", async () => {
    const { ctx, calls } = context([item({})]);
    expect(await pushOutbox(ctx)).toBe(1);
    expect(ctx.api.insertEvent).toHaveBeenCalledWith("cal-1", expect.objectContaining({ id: STABLE_ID, status: "confirmed" }));
    expect(doneCalls(calls)).toEqual([
      { p_id: 1, p_event_id: "ev-new", p_etag: "etag-new", p_error: null, p_permanent: false },
    ]);
  });

  it("updates the event when the stable id already exists (409)", async () => {
    const api = fakeApi({
      insertEvent: vi.fn(async () => {
        throw new GoogleApiError(409);
      }),
    });
    const { ctx, calls } = context([item({})], api);
    await pushOutbox(ctx);
    expect(api.patchEvent).toHaveBeenCalledWith("cal-1", STABLE_ID, expect.objectContaining({ status: "confirmed" }));
    expect(doneCalls(calls)[0]).toMatchObject({ p_event_id: "ev-1", p_etag: "etag-patched" });
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
    const { ctx, calls } = context([item({ op: "delete", eventId: "ev-1", event: null })], api);
    await pushOutbox(ctx);
    expect(doneCalls(calls)).toEqual([{ p_id: 1, p_event_id: null, p_etag: null, p_error: null, p_permanent: false }]);
  });

  it("finishes without calling Google when the entity no longer exists", async () => {
    const { ctx, calls } = context([item({ event: null })]);
    await pushOutbox(ctx);
    expect(ctx.api.insertEvent).not.toHaveBeenCalled();
    expect(doneCalls(calls)[0]).toMatchObject({ p_error: null });
  });

  it("records only the status code and keeps retrying a server error", async () => {
    const api = fakeApi({
      insertEvent: vi.fn(async () => {
        throw new GoogleApiError(503);
      }),
    });
    const { ctx, calls } = context([item({})], api);
    await pushOutbox(ctx);
    expect(doneCalls(calls)[0]).toEqual({ p_id: 1, p_event_id: null, p_etag: null, p_error: "Google 503", p_permanent: false });
  });

  it("closes the row as permanent on a client error that will not change", async () => {
    const api = fakeApi({
      insertEvent: vi.fn(async () => {
        throw new GoogleApiError(403);
      }),
    });
    const { ctx, calls } = context([item({})], api);
    await pushOutbox(ctx);
    expect(doneCalls(calls)[0]).toMatchObject({ p_error: "Google 403", p_permanent: true });
  });

  it("claims nothing and calls nothing once the time budget is spent", async () => {
    const { ctx, calls } = context([item({})], fakeApi(), Date.now() - 1);
    expect(await pushOutbox(ctx)).toBe(0);
    expect(calls).toHaveLength(0);
    expect(ctx.api.insertEvent).not.toHaveBeenCalled();
  });

  it("stops taking the next row when the budget ends in the middle of a batch", async () => {
    const api = fakeApi();
    const { ctx, calls } = context([item({ id: 1 }), item({ id: 2 })], api, Date.now() + 60_000);
    vi.mocked(api.insertEvent).mockImplementationOnce(async () => {
      ctx.deadline = Date.now() - 1;
      return { id: "ev-1", etag: "etag-1" };
    });
    expect(await pushOutbox(ctx)).toBe(1);
    expect(doneCalls(calls).map((call) => call.p_id)).toEqual([1]);
  });
});
