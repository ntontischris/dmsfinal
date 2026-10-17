import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  rpc: vi.fn(),
  createClient: vi.fn(),
}));

vi.mock("@supabase/supabase-js", () => ({ createClient: mocks.createClient }));

import { isSystemHealthy } from "./public-check";

beforeEach(() => {
  vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "http://127.0.0.1:54321");
  vi.stubEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY", "public-anon-key");
  vi.stubEnv("SUPABASE_SERVICE_ROLE_KEY", "service-role-must-not-be-used");
  vi.spyOn(console, "error").mockImplementation(() => undefined);
  mocks.createClient.mockReturnValue({ rpc: mocks.rpc });
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.clearAllMocks();
});

describe("isSystemHealthy", () => {
  it("should ask health_ok with the public key, never the service role", async () => {
    mocks.rpc.mockResolvedValue({ data: true, error: null });

    expect(await isSystemHealthy()).toBe(true);
    expect(mocks.createClient).toHaveBeenCalledWith(
      "http://127.0.0.1:54321",
      "public-anon-key",
      expect.anything(),
    );
    expect(mocks.rpc).toHaveBeenCalledWith("health_ok", {});
  });

  it("should be unhealthy when the queue is late, the database errors or throws", async () => {
    mocks.rpc.mockResolvedValueOnce({ data: false, error: null });
    expect(await isSystemHealthy()).toBe(false);

    mocks.rpc.mockResolvedValueOnce({ data: null, error: { message: "down" } });
    expect(await isSystemHealthy()).toBe(false);

    mocks.rpc.mockRejectedValueOnce(new Error("fetch failed"));
    expect(await isSystemHealthy()).toBe(false);

    mocks.rpc.mockResolvedValueOnce({ data: "true", error: null });
    expect(await isSystemHealthy()).toBe(false);
  });

  it("should be unhealthy without a database connection", async () => {
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "");

    expect(await isSystemHealthy()).toBe(false);
    expect(mocks.createClient).not.toHaveBeenCalled();
  });
});
