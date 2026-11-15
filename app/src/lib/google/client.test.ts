import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { changesUrl, createGoogleCalendarApi, GoogleApiError } from "./client";
import type { GoogleEventBody } from "./schemas";

// Ο πελάτης του Google με ψεύτικο fetch και ψεύτικο token: URL, μέθοδος, σώμα και χειρισμός σφαλμάτων.
vi.mock("./token", () => ({ getAccessToken: vi.fn(async () => "tok-test") }));

const config = { email: "svc@example.iam", privateKey: "unused" };
const CAL = "cal-devre@group.calendar.google.com";
const CAL_PATH = `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(CAL)}`;
const BODY: GoogleEventBody = {
  status: "confirmed",
  summary: "Δοκιμή",
  description: "",
  location: "",
  start: { dateTime: "2027-01-05T10:00:00+02:00", timeZone: "Europe/Athens" },
  end: { dateTime: "2027-01-05T12:00:00+02:00", timeZone: "Europe/Athens" },
  transparency: "opaque",
};

const json = (value: unknown, status = 200) =>
  new Response(JSON.stringify(value), { status });
const empty = (status: number) => new Response(null, { status });

let fetchMock: ReturnType<typeof vi.fn>;

beforeEach(() => {
  fetchMock = vi.fn(async () => json({ id: "ev-1", etag: "etag-1" }));
  vi.stubGlobal("fetch", fetchMock);
});

afterEach(() => vi.unstubAllGlobals());

const lastCall = (): { url: string; init: RequestInit } => {
  const [url, init] = fetchMock.mock.calls.at(-1) as [string, RequestInit];
  return { url, init };
};

describe("createGoogleCalendarApi", () => {
  it("inserts with the bearer token, a JSON body and no invitation emails", async () => {
    const api = createGoogleCalendarApi(config);
    expect(await api.insertEvent(CAL, BODY)).toEqual({
      id: "ev-1",
      etag: "etag-1",
    });
    const { url, init } = lastCall();
    expect(url).toBe(`${CAL_PATH}/events?sendUpdates=none`);
    expect(init.method).toBe("POST");
    expect(init.headers).toMatchObject({
      Authorization: "Bearer tok-test",
      "Content-Type": "application/json",
    });
    expect(JSON.parse(String(init.body))).toEqual(BODY);
  });

  it("escapes the event id in the path when patching", async () => {
    await createGoogleCalendarApi(config).patchEvent(CAL, "ev/1 x", BODY);
    const { url, init } = lastCall();
    expect(url).toBe(
      `${CAL_PATH}/events/${encodeURIComponent("ev/1 x")}?sendUpdates=none`,
    );
    expect(init.method).toBe("PATCH");
  });

  it("throws GoogleApiError with only the status code on a failed call", async () => {
    fetchMock.mockResolvedValueOnce(json({ error: { message: "quota" } }, 503));
    const error = await createGoogleCalendarApi(config)
      .insertEvent(CAL, BODY)
      .catch((e: unknown) => e);
    expect(error).toBeInstanceOf(GoogleApiError);
    expect(error).toMatchObject({ status: 503, message: "google 503" });
  });

  it("rejects a reply that is not an event write", async () => {
    fetchMock.mockResolvedValueOnce(json({ id: "ev-1" }));
    await expect(
      createGoogleCalendarApi(config).insertEvent(CAL, BODY),
    ).rejects.toThrow();
  });

  it("treats a delete of an event Google no longer has (404, 410) as done", async () => {
    const api = createGoogleCalendarApi(config);
    fetchMock.mockResolvedValueOnce(empty(404));
    await expect(api.deleteEvent(CAL, "ev-1")).resolves.toBeUndefined();
    fetchMock.mockResolvedValueOnce(empty(410));
    await expect(api.deleteEvent(CAL, "ev-1")).resolves.toBeUndefined();
    expect(lastCall().init.method).toBe("DELETE");
  });

  it("keeps any other delete failure as an error", async () => {
    fetchMock.mockResolvedValueOnce(empty(403));
    await expect(
      createGoogleCalendarApi(config).deleteEvent(CAL, "ev-1"),
    ).rejects.toMatchObject({ status: 403 });
  });

  it("accepts an empty 204 reply without reading a body", async () => {
    fetchMock.mockResolvedValueOnce(empty(204));
    await expect(
      createGoogleCalendarApi(config).deleteEvent(CAL, "ev-1"),
    ).resolves.toBeUndefined();
  });

  it("sends no body or content type on a read", async () => {
    fetchMock.mockResolvedValueOnce(
      json({ items: [], nextSyncToken: "sync-2" }),
    );
    const page = await createGoogleCalendarApi(config).listChanges({
      calendarId: CAL,
      syncToken: "sync-1",
    });
    expect(page).toEqual({ items: [], nextSyncToken: "sync-2" });
    const { init } = lastCall();
    expect(init.method).toBe("GET");
    expect(init.body).toBeUndefined();
    expect(init.headers).not.toHaveProperty("Content-Type");
  });
});

describe("changesUrl", () => {
  const params = (url: string) => new URL(url).searchParams;

  it("reads everything with deletions and recurring masters when there is no token", () => {
    const p = params(changesUrl({ calendarId: CAL }));
    expect(p.get("singleEvents")).toBe("false");
    expect(p.get("showDeleted")).toBe("true");
    expect(p.get("maxResults")).toBe("250");
    expect(p.has("syncToken")).toBe(false);
    expect(p.has("timeMin")).toBe(false);
  });

  it("carries the sync token and the page token together", () => {
    const p = params(
      changesUrl({ calendarId: CAL, syncToken: "s-1", pageToken: "p-2" }),
    );
    expect(p.get("syncToken")).toBe("s-1");
    expect(p.get("pageToken")).toBe("p-2");
  });
});
