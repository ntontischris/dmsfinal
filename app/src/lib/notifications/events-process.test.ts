import type { SupabaseClient } from "@supabase/supabase-js";
import { afterEach, describe, expect, it, vi } from "vitest";

import { processEvents } from "./events-process";

function fakeAdmin(reply: {
  data: unknown;
  error: { message: string } | null;
}) {
  const rpc = vi.fn(async () => reply);
  return { admin: { rpc } as unknown as SupabaseClient, rpc };
}

describe("processEvents", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("should call the processor RPC and return its summary", async () => {
    const summary = { processed: 2, failed: 0, sent: 3, cleaned: 1 };
    const { admin, rpc } = fakeAdmin({ data: summary, error: null });

    expect(await processEvents(admin)).toEqual(summary);
    expect(rpc).toHaveBeenCalledWith("events_process");
  });

  it("should report zeros when the database returns an unexpected shape", async () => {
    const { admin } = fakeAdmin({ data: null, error: null });

    expect(await processEvents(admin)).toEqual({
      processed: 0,
      failed: 0,
      sent: 0,
      cleaned: 0,
    });
  });

  it("should return a safe message and log only the database text when the RPC fails", async () => {
    const errorSpy = vi
      .spyOn(console, "error")
      .mockImplementation(() => undefined);
    const { admin } = fakeAdmin({
      data: null,
      error: { message: "permission denied" },
    });

    expect(await processEvents(admin)).toEqual({
      error: "Τα Γεγονότα δεν επεξεργάστηκαν.",
    });
    expect(errorSpy).toHaveBeenCalledWith(
      "events_process",
      "permission denied",
    );
  });
});
