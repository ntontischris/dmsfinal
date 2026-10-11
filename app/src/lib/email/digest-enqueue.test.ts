import type { SupabaseClient } from "@supabase/supabase-js";
import { afterEach, describe, expect, it, vi } from "vitest";

import { enqueueMessageDigest } from "./digest-enqueue";

function fakeAdmin(reply: {
  data: unknown;
  error: { message: string } | null;
}) {
  const rpc = vi.fn(async () => reply);
  return { admin: { rpc } as unknown as SupabaseClient, rpc };
}

describe("enqueueMessageDigest", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("should call the enqueue RPC and report how many emails were queued", async () => {
    const { admin, rpc } = fakeAdmin({ data: 3, error: null });

    expect(await enqueueMessageDigest(admin)).toEqual({ queued: 3 });
    expect(rpc).toHaveBeenCalledWith("message_digest_enqueue");
  });

  it("should count zero when the database returns no number", async () => {
    const { admin } = fakeAdmin({ data: null, error: null });

    expect(await enqueueMessageDigest(admin)).toEqual({ queued: 0 });
  });

  it("should return a safe message and log only the database text when the RPC fails", async () => {
    const errorSpy = vi
      .spyOn(console, "error")
      .mockImplementation(() => undefined);
    const { admin } = fakeAdmin({
      data: null,
      error: { message: "permission denied" },
    });

    expect(await enqueueMessageDigest(admin)).toEqual({
      error: "Οι συνόψεις Μηνυμάτων δεν μπήκαν στην ουρά.",
    });
    expect(errorSpy).toHaveBeenCalledWith(
      "message_digest_enqueue",
      "permission denied",
    );
  });
});
