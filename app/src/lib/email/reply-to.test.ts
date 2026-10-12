import type { SupabaseClient } from "@supabase/supabase-js";
import { describe, expect, it, vi } from "vitest";

import { clearReplyToCache, readReplyToQuick, toReplyTo } from "./reply-to";

describe("toReplyTo", () => {
  it("should keep a valid address without surrounding spaces", () => {
    expect(toReplyTo("  hello@studio.example.com ")).toBe(
      "hello@studio.example.com",
    );
  });

  it("should drop an empty, invalid or missing address", () => {
    expect(toReplyTo("")).toBeUndefined();
    expect(toReplyTo("όχι email")).toBeUndefined();
    expect(toReplyTo(null)).toBeUndefined();
  });
});

describe("readReplyToQuick", () => {
  const adminWith = (reply: () => Promise<unknown>) =>
    ({
      from: () => ({
        select: () => ({ eq: () => ({ maybeSingle: reply }) }),
      }),
    }) as unknown as SupabaseClient;

  it("should give up after the timeout and send without reply-to", async () => {
    clearReplyToCache();
    const slow = adminWith(() => new Promise(() => undefined));
    expect(await readReplyToQuick(slow, 0, 10)).toBeUndefined();
  });

  it("should keep a found address in memory for 5 minutes", async () => {
    clearReplyToCache();
    const reply = vi.fn(async () => ({
      data: { reply_to_email: "hello@studio.example.com" },
      error: null,
    }));
    const admin = adminWith(reply);
    expect(await readReplyToQuick(admin, 0)).toBe("hello@studio.example.com");
    expect(await readReplyToQuick(admin, 60_000)).toBe("hello@studio.example.com");
    expect(reply).toHaveBeenCalledTimes(1);
    await readReplyToQuick(admin, 6 * 60_000);
    expect(reply).toHaveBeenCalledTimes(2);
  });
});
