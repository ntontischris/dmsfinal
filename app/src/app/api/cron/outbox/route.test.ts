import { NextRequest } from "next/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import { GET } from "./route";

const request = (authorization?: string) =>
  new NextRequest("http://localhost:3000/api/cron/outbox", {
    headers: authorization ? { authorization } : {},
  });

beforeEach(() => {
  vi.stubEnv("CRON_SECRET", "test-cron-secret");
  vi.spyOn(console, "error").mockImplementation(() => undefined);
});

afterEach(() => vi.unstubAllEnvs());

describe("GET /api/cron/outbox", () => {
  it("απαντά 500 όταν δεν έχει οριστεί CRON_SECRET", async () => {
    vi.stubEnv("CRON_SECRET", "");
    expect((await GET(request("Bearer "))).status).toBe(500);
  });

  it("απαντά 401 χωρίς Authorization", async () => {
    expect((await GET(request())).status).toBe(401);
  });

  it("απαντά 401 με λάθος μυστικό", async () => {
    expect((await GET(request("Bearer wrong-secret"))).status).toBe(401);
  });
});
