import type { SupabaseClient } from "@supabase/supabase-js";
import { afterEach, describe, expect, it, vi } from "vitest";

import {
  checkHealth,
  cleanSends,
  markJobEnd,
  markJobStart,
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
