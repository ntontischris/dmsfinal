import type { SupabaseClient } from "@supabase/supabase-js";
import { afterEach, describe, expect, it, vi } from "vitest";

import { enqueueOverdueInvoices } from "./overdue-enqueue";

function fakeAdmin(reply: { data: unknown; error: { message: string } | null }) {
  const rpc = vi.fn(async () => reply);
  return { admin: { rpc } as unknown as SupabaseClient, rpc };
}

describe("enqueueOverdueInvoices", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("should call the enqueue RPC and report how many invoices were queued", async () => {
    const { admin, rpc } = fakeAdmin({ data: 2, error: null });

    expect(await enqueueOverdueInvoices(admin)).toEqual({ queued: 2 });
    expect(rpc).toHaveBeenCalledWith("invoice_overdue_enqueue");
  });

  it("should count zero when the database returns no number", async () => {
    const { admin } = fakeAdmin({ data: null, error: null });

    expect(await enqueueOverdueInvoices(admin)).toEqual({ queued: 0 });
  });

  it("should return a safe message and log only the database text when the RPC fails", async () => {
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => undefined);
    const { admin } = fakeAdmin({ data: null, error: { message: "permission denied" } });

    expect(await enqueueOverdueInvoices(admin)).toEqual({
      error: "Τα ληξιπρόθεσμα δεν μπήκαν στην ουρά.",
    });
    expect(errorSpy).toHaveBeenCalledWith("invoice_overdue_enqueue", "permission denied");
  });
});
