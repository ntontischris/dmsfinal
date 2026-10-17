import { afterEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ isSystemHealthy: vi.fn() }));

vi.mock("@/modules/health", () => ({ isSystemHealthy: mocks.isSystemHealthy }));

import { GET, HEAD } from "./route";

afterEach(() => {
  vi.clearAllMocks();
});

const expectNoStore = (response: Response) => {
  expect(response.headers.get("cache-control")).toBe("no-store, max-age=0");
  expect(response.headers.get("cdn-cache-control")).toBe("no-store");
  expect(response.headers.get("vercel-cdn-cache-control")).toBe("no-store");
};

describe("GET /api/health", () => {
  it("should answer 200 with only the ok flag when the system is healthy", async () => {
    mocks.isSystemHealthy.mockResolvedValue(true);

    const response = await GET();

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ ok: true });
    expectNoStore(response);
  });

  it("should answer 503 with only the ok flag when the queue is late or the database is down", async () => {
    mocks.isSystemHealthy.mockResolvedValue(false);

    const response = await GET();

    expect(response.status).toBe(503);
    expect(await response.json()).toEqual({ ok: false });
    expectNoStore(response);
  });
});

describe("HEAD /api/health", () => {
  it("should give the same status without a body", async () => {
    mocks.isSystemHealthy.mockResolvedValue(false);

    const response = await HEAD();

    expect(response.status).toBe(503);
    expect(await response.text()).toBe("");
    expectNoStore(response);
  });
});
