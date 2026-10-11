import type { SupabaseClient } from "@supabase/supabase-js";
import { afterEach, describe, expect, it, vi } from "vitest";

import { cleanExpiredAttachmentSlots } from "./attachments-cleanup";

const NOW = new Date("2026-10-12T12:00:00.000Z");

// Ψεύτικος service role: rpc και storage.remove με τις απαντήσεις που ζητά κάθε τεστ.
function fakeAdmin(
  rpcReply: { data: unknown; error: { message: string } | null },
  removeReply: { error: { message: string } | null } = { error: null },
) {
  const rpc = vi.fn(async () => rpcReply);
  const remove = vi.fn(async () => removeReply);
  const from = vi.fn(() => ({ remove }));
  return { admin: { rpc, storage: { from } } as unknown as SupabaseClient, rpc, remove, from };
}

describe("cleanExpiredAttachmentSlots", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("should ask for slots older than 24 hours and remove their files", async () => {
    const { admin, rpc, remove, from } = fakeAdmin({ data: ["c/1.pdf", "c/2.png"], error: null });

    expect(await cleanExpiredAttachmentSlots(admin, NOW)).toEqual({ removed: 2 });
    expect(rpc).toHaveBeenCalledWith("message_attachment_slots_expired", {
      p_before: "2026-10-11T12:00:00.000Z",
    });
    expect(from).toHaveBeenCalledWith("message-attachments");
    expect(remove).toHaveBeenCalledWith(["c/1.pdf", "c/2.png"]);
  });

  it("should not touch the storage when nothing expired", async () => {
    const { admin, remove } = fakeAdmin({ data: [], error: null });

    expect(await cleanExpiredAttachmentSlots(admin, NOW)).toEqual({ removed: 0 });
    expect(remove).not.toHaveBeenCalled();
  });

  it("should log and return a safe message when the RPC fails", async () => {
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => undefined);
    const { admin, remove } = fakeAdmin({ data: null, error: { message: "permission denied" } });

    expect(await cleanExpiredAttachmentSlots(admin, NOW)).toEqual({
      error: "Τα ανεκμετάλλευτα συνημμένα δεν καθαρίστηκαν.",
    });
    expect(errorSpy).toHaveBeenCalledWith("message_attachment_slots_expired", "permission denied");
    expect(remove).not.toHaveBeenCalled();
  });

  it("should log and return a safe message when the files cannot be removed", async () => {
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => undefined);
    const { admin } = fakeAdmin({ data: ["c/1.pdf"], error: null }, { error: { message: "storage down" } });

    expect(await cleanExpiredAttachmentSlots(admin, NOW)).toEqual({
      error: "Τα ανεκμετάλλευτα συνημμένα δεν καθαρίστηκαν.",
    });
    expect(errorSpy).toHaveBeenCalledWith("removeExpiredAttachments", "storage down");
  });
});
