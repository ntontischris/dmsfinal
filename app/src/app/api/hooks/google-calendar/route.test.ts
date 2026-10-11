import { NextRequest } from "next/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

const { rpc } = vi.hoisted(() => ({ rpc: vi.fn() }));
vi.mock("@/lib/supabase/admin", () => ({ createAdminClient: () => ({ rpc }) }));

import { POST } from "./route";

const CHANNEL = "channel-1";
const TOKEN = "token-1";

const notification = (headers: Record<string, string>) =>
  new NextRequest("http://localhost:3000/api/hooks/google-calendar", { method: "POST", headers });

beforeEach(() => {
  rpc.mockReset();
  vi.stubEnv("GOOGLE_SERVICE_ACCOUNT_EMAIL", "");
  vi.stubEnv("GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY", "");
  vi.spyOn(console, "error").mockImplementation(() => undefined);
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});

describe("POST /api/hooks/google-calendar", () => {
  it("answers 401 when the channel headers are missing", async () => {
    expect((await POST(notification({}))).status).toBe(401);
    expect(rpc).not.toHaveBeenCalled();
  });

  it("answers 401 when the channel token does not match", async () => {
    rpc.mockResolvedValueOnce({ data: false, error: null });
    const headers = { "x-goog-channel-id": CHANNEL, "x-goog-channel-token": "wrong" };
    expect((await POST(notification(headers))).status).toBe(401);
  });

  it("answers 200 for the initial sync message without starting a pull", async () => {
    rpc.mockResolvedValueOnce({ data: true, error: null });
    const headers = {
      "x-goog-channel-id": CHANNEL,
      "x-goog-channel-token": TOKEN,
      "x-goog-resource-state": "sync",
    };
    expect((await POST(notification(headers))).status).toBe(200);
    expect(rpc).toHaveBeenCalledWith("google_channel_check", { p_channel_id: CHANNEL, p_token: TOKEN });
  });
});
