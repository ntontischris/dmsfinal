import type { SupabaseClient } from "@supabase/supabase-js";
import { vi } from "vitest";

import type { GoogleCalendarApi } from "./client";

// Ψεύτικα για τα τεστ του Google: ένας service role που καταγράφει τα RPC, και ένα API που καταγράφει τις κλήσεις.
// Το cast γίνεται μόνο εδώ, στα τεστ.
export interface RpcCall {
  name: string;
  args: Record<string, unknown>;
}

export function fakeClient(replies: Record<string, (args: Record<string, unknown>) => unknown> = {}) {
  const calls: RpcCall[] = [];
  const rpc = vi.fn(async (name: string, args: Record<string, unknown> = {}) => {
    calls.push({ name, args });
    const reply = replies[name];
    return { data: reply ? reply(args) : null, error: null };
  });
  return { client: { rpc } as unknown as SupabaseClient, calls };
}

export function fakeApi(overrides: Partial<GoogleCalendarApi> = {}): GoogleCalendarApi {
  return {
    createCalendar: vi.fn(async () => "cal-1"),
    shareCalendar: vi.fn(async () => undefined),
    insertEvent: vi.fn(async () => ({ id: "ev-new", etag: "etag-new" })),
    patchEvent: vi.fn(async () => ({ id: "ev-1", etag: "etag-patched" })),
    deleteEvent: vi.fn(async () => undefined),
    listChanges: vi.fn(async () => ({ items: [] })),
    watchEvents: vi.fn(async () => ({ id: "ch-1", resourceId: "res-1", expiration: String(Date.now() + 7 * 86_400_000) })),
    stopChannel: vi.fn(async () => undefined),
    ...overrides,
  };
}

export const rpcNames = (calls: RpcCall[]): string[] => calls.map((call) => call.name);
