import { NextRequest } from "next/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

const { rpc } = vi.hoisted(() => ({
  rpc: vi.fn(
    async (): Promise<{
      data: unknown;
      error: { message: string } | null;
    }> => ({
      data: { conversations: 2 },
      error: null,
    }),
  ),
}));
vi.mock("@/lib/supabase/admin", () => ({ createAdminClient: () => ({ rpc }) }));

import { GET } from "./route";

const SECRET = "cron-test-secret";

const cronRequest = (authorization?: string) =>
  new NextRequest("http://localhost:3000/api/cron/assistant-purge", {
    headers: authorization ? { authorization } : {},
  });

beforeEach(() => {
  vi.stubEnv("CRON_SECRET", SECRET);
  rpc.mockClear();
});

afterEach(() => vi.unstubAllEnvs());

describe("GET /api/cron/assistant-purge", () => {
  it("answers 500 when CRON_SECRET is missing", async () => {
    vi.stubEnv("CRON_SECRET", "");
    expect((await GET(cronRequest(`Bearer ${SECRET}`))).status).toBe(500);
  });

  it("answers 401 without calling the database when the bearer token is wrong", async () => {
    expect((await GET(cronRequest("Bearer wrong"))).status).toBe(401);
    expect(rpc).not.toHaveBeenCalled();
  });

  it("purges once and returns how many conversations were deleted", async () => {
    const response = await GET(cronRequest(`Bearer ${SECRET}`));
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ conversations: 2 });
    expect(rpc).toHaveBeenCalledWith("assistant_purge", {});
  });

  it("answers 500 when the database fails", async () => {
    rpc.mockResolvedValueOnce({ data: null, error: { message: "boom" } });
    vi.spyOn(console, "error").mockImplementation(() => undefined);
    expect((await GET(cronRequest(`Bearer ${SECRET}`))).status).toBe(500);
  });
});
