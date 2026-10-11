import type { SupabaseClient } from "@supabase/supabase-js";
import { afterEach, describe, expect, it, vi } from "vitest";

import { generateBillables } from "./billables-generate";

// Ψεύτικος service role: μόνο το rpc που χρειάζεται η συνάρτηση, με την απάντηση που ζητά κάθε τεστ.
function fakeAdmin(reply: { data: unknown; error: { message: string } | null }) {
  const rpc = vi.fn(async () => reply);
  return { admin: { rpc } as unknown as SupabaseClient, rpc };
}

describe("generateBillables", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("should call the generator RPC and report how many billables were written", async () => {
    const { admin, rpc } = fakeAdmin({ data: 2, error: null });

    expect(await generateBillables(admin)).toEqual({ generated: 2 });
    expect(rpc).toHaveBeenCalledWith("billables_generate");
  });

  it("should count zero when the database returns no number", async () => {
    const { admin } = fakeAdmin({ data: null, error: null });

    expect(await generateBillables(admin)).toEqual({ generated: 0 });
  });

  it("should return a safe message and log only the database text when the RPC fails", async () => {
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => undefined);
    const { admin } = fakeAdmin({ data: null, error: { message: "permission denied" } });

    expect(await generateBillables(admin)).toEqual({
      error: "Τα Τιμολογητέα δεν γεννήθηκαν.",
    });
    expect(errorSpy).toHaveBeenCalledWith("billables_generate", "permission denied");
  });
});
