import type { SupabaseClient } from "@supabase/supabase-js";
import { afterEach, describe, expect, it, vi } from "vitest";

import { enqueueDeliverableReminders } from "./reminders-enqueue";

// Ψεύτικος service role: μόνο το rpc που χρειάζεται η συνάρτηση, με την απάντηση που ζητά κάθε τεστ.
function fakeAdmin(reply: { data: unknown; error: { message: string } | null }) {
  const rpc = vi.fn(async () => reply);
  return { admin: { rpc } as unknown as SupabaseClient, rpc };
}

describe("enqueueDeliverableReminders", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("should call the enqueue RPC and report how many reminders were queued", async () => {
    const { admin, rpc } = fakeAdmin({ data: 2, error: null });

    expect(await enqueueDeliverableReminders(admin)).toEqual({ queued: 2 });
    expect(rpc).toHaveBeenCalledWith("deliverable_reminders_enqueue");
  });

  it("should count zero when the database returns no number", async () => {
    const { admin } = fakeAdmin({ data: null, error: null });

    expect(await enqueueDeliverableReminders(admin)).toEqual({ queued: 0 });
  });

  it("should return a safe message and log only the database text when the RPC fails", async () => {
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => undefined);
    const { admin } = fakeAdmin({ data: null, error: { message: "permission denied" } });

    expect(await enqueueDeliverableReminders(admin)).toEqual({
      error: "Οι υπενθυμίσεις δεν μπήκαν στην ουρά.",
    });
    expect(errorSpy).toHaveBeenCalledWith("deliverable_reminders_enqueue", "permission denied");
  });
});
