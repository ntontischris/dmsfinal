import { NextRequest } from "next/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

const { rpc } = vi.hoisted(() => ({ rpc: vi.fn(async () => ({ data: null, error: null })) }));
vi.mock("@/lib/supabase/admin", () => ({ createAdminClient: () => ({ rpc }) }));

import { GET } from "./route";

const SECRET = "cron-test-secret";

const cronRequest = (authorization?: string) =>
  new NextRequest("http://localhost:3000/api/cron/google", {
    headers: authorization ? { authorization } : {},
  });

beforeEach(() => {
  vi.stubEnv("CRON_SECRET", SECRET);
  vi.stubEnv("GOOGLE_SERVICE_ACCOUNT_EMAIL", "");
  vi.stubEnv("GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY", "");
  rpc.mockClear();
});

afterEach(() => vi.unstubAllEnvs());

describe("GET /api/cron/google", () => {
  it("answers 500 when CRON_SECRET is missing", async () => {
    vi.stubEnv("CRON_SECRET", "");
    expect((await GET(cronRequest(`Bearer ${SECRET}`))).status).toBe(500);
  });

  it("answers 401 when the bearer token is wrong", async () => {
    expect((await GET(cronRequest("Bearer wrong"))).status).toBe(401);
    expect(rpc).not.toHaveBeenCalled();
  });

  it("answers 200 skipped without any Google call when the account is not configured, but still records the run and checks health", async () => {
    const response = await GET(cronRequest(`Bearer ${SECRET}`));
    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({ skipped: "not-configured" });
    expect(rpc.mock.calls.map((call: unknown[]) => call[0])).toEqual(["job_run_mark", "health_check", "job_run_mark"]);
    expect(rpc).toHaveBeenLastCalledWith("job_run_mark", { p_job: "google", p_ok: true, p_error: null });
  });
});
