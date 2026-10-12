import type { SupabaseClient } from "@supabase/supabase-js";
import { afterEach, describe, expect, it, vi } from "vitest";

import { scanAutomations } from "./automations-scan";

function fakeAdmin(reply: {
  data: unknown;
  error: { message: string } | null;
}) {
  const rpc = vi.fn(async () => reply);
  return { admin: { rpc } as unknown as SupabaseClient, rpc };
}

describe("scanAutomations", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("should call the scan RPC and return its summary", async () => {
    const { admin, rpc } = fakeAdmin({ data: { sent: 4, failed: 1 }, error: null });

    expect(await scanAutomations(admin)).toEqual({ sent: 4, failed: 1 });
    expect(rpc).toHaveBeenCalledWith("automations_scan");
  });

  it("should report zeros when the database returns an unexpected shape", async () => {
    const { admin } = fakeAdmin({ data: null, error: null });

    expect(await scanAutomations(admin)).toEqual({ sent: 0, failed: 0 });
  });

  it("should return a safe message and log only the database text when the RPC fails", async () => {
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => undefined);
    const { admin } = fakeAdmin({ data: null, error: { message: "permission denied" } });

    expect(await scanAutomations(admin)).toEqual({ error: "Ο έλεγχος χρονισμών δεν έτρεξε." });
    expect(errorSpy).toHaveBeenCalledWith("automations_scan", "permission denied");
  });
});
