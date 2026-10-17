import type { SupabaseClient } from "@supabase/supabase-js";
import { afterEach, describe, expect, it, vi } from "vitest";

import {
  checkHealth,
  cleanSends,
  markJobEnd,
  markJobStart,
  markSteps,
} from "./health";

function fakeAdmin(reply: {
  data: unknown;
  error: { message: string } | null;
}) {
  const rpc = vi.fn(async () => reply);
  return { admin: { rpc } as unknown as SupabaseClient, rpc };
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe("markJobStart / markJobEnd", () => {
  it("should record the start with p_ok null", async () => {
    const { admin, rpc } = fakeAdmin({ data: null, error: null });

    await markJobStart(admin, "outbox");

    expect(rpc).toHaveBeenCalledWith("job_run_mark", {
      p_job: "outbox",
      p_ok: null,
      p_error: null,
    });
  });

  it("should record success without an error and failure with it", async () => {
    const { admin, rpc } = fakeAdmin({ data: null, error: null });

    await markJobEnd(admin, "google", null);
    await markJobEnd(admin, "google", "boom");

    expect(rpc).toHaveBeenNthCalledWith(1, "job_run_mark", {
      p_job: "google",
      p_ok: true,
      p_error: null,
    });
    expect(rpc).toHaveBeenNthCalledWith(2, "job_run_mark", {
      p_job: "google",
      p_ok: false,
      p_error: "boom",
    });
  });

  it("should log and carry on when the database refuses", async () => {
    const errorSpy = vi
      .spyOn(console, "error")
      .mockImplementation(() => undefined);
    const { admin } = fakeAdmin({ data: null, error: { message: "denied" } });

    await expect(markJobStart(admin, "outbox")).resolves.toBeUndefined();
    expect(errorSpy).toHaveBeenCalledWith("job_run_mark", "denied");
  });
});

describe("checkHealth", () => {
  it("should pass the job and return the summary", async () => {
    const summary = { jobs: 1, google: 0, events: 2 };
    const { admin, rpc } = fakeAdmin({ data: summary, error: null });

    expect(await checkHealth(admin, "google")).toEqual(summary);
    expect(rpc).toHaveBeenCalledWith("health_check", { p_job: "google" });
  });

  it("should return a safe message when the RPC fails", async () => {
    vi.spyOn(console, "error").mockImplementation(() => undefined);
    const { admin } = fakeAdmin({ data: null, error: { message: "boom" } });

    expect(await checkHealth(admin, "outbox")).toEqual({
      error: "Ο έλεγχος Υγείας δεν έτρεξε.",
    });
  });
});

describe("cleanSends", () => {
  it("should return how many rows were removed", async () => {
    const summary = { sends: 3, logs: 1, outbox: 2 };
    const { admin, rpc } = fakeAdmin({ data: summary, error: null });

    expect(await cleanSends(admin)).toEqual(summary);
    expect(rpc).toHaveBeenCalledWith("sends_cleanup");
  });

  it("should pass through the daily skip and treat an unexpected shape as skipped", async () => {
    expect(await cleanSends(fakeAdmin({ data: { skipped: true }, error: null }).admin)).toEqual({ skipped: true });
    expect(await cleanSends(fakeAdmin({ data: "x", error: null }).admin)).toEqual({ skipped: true });
  });
});

describe("markSteps", () => {
  const OK = {
    billables: { generated: 0 },
    events: { processed: 1, failed: 1, sent: 0, cleaned: 0 },
    timed: { sent: 0, failed: 0 },
    cleanup: { skipped: true },
  };

  it("should record every step as run, and skip the cleanup on the days it did not run", async () => {
    const { admin, rpc } = fakeAdmin({ data: null, error: null });

    await markSteps(admin, OK);

    expect(rpc.mock.calls).toEqual([
      ["job_run_mark", { p_job: "billables", p_ok: true, p_error: null }],
      ["job_run_mark", { p_job: "events_process", p_ok: true, p_error: null }],
      ["job_run_mark", { p_job: "automations_scan", p_ok: true, p_error: null }],
    ]);
  });

  it("should record a step's error and a failed timing check as failures", async () => {
    const { admin, rpc } = fakeAdmin({ data: null, error: null });

    await markSteps(admin, {
      billables: { error: "Τα Τιμολογητέα δεν γεννήθηκαν." },
      events: OK.events,
      timed: { sent: 0, failed: 2 },
      cleanup: { sends: 1, logs: 0, outbox: 0 },
    });

    expect(rpc.mock.calls).toEqual([
      ["job_run_mark", { p_job: "billables", p_ok: false, p_error: "Τα Τιμολογητέα δεν γεννήθηκαν." }],
      ["job_run_mark", { p_job: "events_process", p_ok: true, p_error: null }],
      ["job_run_mark", { p_job: "automations_scan", p_ok: false, p_error: "Δεν έτρεξαν 2 έλεγχοι χρονισμών." }],
      ["job_run_mark", { p_job: "sends_cleanup", p_ok: true, p_error: null }],
    ]);
  });
});
