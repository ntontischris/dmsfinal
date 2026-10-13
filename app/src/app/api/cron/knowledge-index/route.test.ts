import { NextRequest } from "next/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

const mocks = vi.hoisted(() => ({ rpc: vi.fn(), runKnowledgeIndex: vi.fn() }));
vi.mock("@/lib/supabase/admin", () => ({ createAdminClient: () => ({ rpc: mocks.rpc }) }));
vi.mock("@/lib/knowledge-index/worker", () => ({ runKnowledgeIndex: mocks.runKnowledgeIndex }));

import { GET } from "./route";

const SECRET = "test-cron-secret";
const ITEM = "11111111-1111-4111-8111-111111111111";
const SUMMARY = { indexed: 1, stale: 0, failed: 0 };

const request = (authorization?: string, query = "") =>
  new NextRequest(`http://localhost:3000/api/cron/knowledge-index${query}`, {
    headers: authorization ? { authorization } : {},
  });

beforeEach(() => {
  vi.stubEnv("CRON_SECRET", SECRET);
  vi.spyOn(console, "error").mockImplementation(() => undefined);
  mocks.rpc.mockResolvedValue({ data: { pending: 0, stuck: 0 }, error: null });
  mocks.runKnowledgeIndex.mockResolvedValue(SUMMARY);
});
afterEach(() => {
  vi.unstubAllEnvs();
  vi.clearAllMocks();
});

describe("GET /api/cron/knowledge-index", () => {
  it("500 χωρίς CRON_SECRET, 401 με λάθος Bearer, χωρίς να αγγίξει την ουρά", async () => {
    vi.stubEnv("CRON_SECRET", "");
    expect((await GET(request("Bearer "))).status).toBe(500);
    vi.stubEnv("CRON_SECRET", SECRET);
    expect((await GET(request("Bearer wrong"))).status).toBe(401);
    expect(mocks.runKnowledgeIndex).not.toHaveBeenCalled();
  });

  it("το cron του λεπτού: έναρξη και τέλος στο job_runs γύρω από τον γύρο", async () => {
    const response = await GET(request(`Bearer ${SECRET}`));
    expect(await response.json()).toEqual(SUMMARY);
    expect(mocks.rpc.mock.calls).toEqual([
      ["knowledge_index_mark", { p_ok: null, p_error: null }],
      ["knowledge_index_mark", { p_ok: true, p_error: null }],
    ]);
  });

  it("σφάλμα του γύρου: γράφεται στο job_runs", async () => {
    mocks.runKnowledgeIndex.mockRejectedValue(new Error("boom"));
    await expect(GET(request(`Bearer ${SECRET}`))).rejects.toThrow("boom");
    expect(mocks.rpc).toHaveBeenLastCalledWith("knowledge_index_mark", { p_ok: false, p_error: "boom" });
  });

  it("άμεση προσπάθεια για ένα στοιχείο: χωρίς job_runs", async () => {
    await GET(request(`Bearer ${SECRET}`, `?item=${ITEM}`));
    expect(mocks.runKnowledgeIndex).toHaveBeenCalledWith(expect.anything(), { itemId: ITEM, limit: 1 });
    expect(mocks.rpc).not.toHaveBeenCalled();
  });

  it("σκούντημα (kick=1): ένας γύρος χωρίς job_runs", async () => {
    await GET(request(`Bearer ${SECRET}`, "?kick=1"));
    expect(mocks.runKnowledgeIndex).toHaveBeenCalledTimes(1);
    expect(mocks.rpc).not.toHaveBeenCalled();
  });
});
