import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ rpc: vi.fn(), aiAvailable: vi.fn(), embedQuery: vi.fn() }));
vi.mock("@/lib/supabase/server", () => ({ createSupabase: async () => ({ rpc: mocks.rpc }) }));
vi.mock("@/lib/ai/available", () => ({ aiAvailable: mocks.aiAvailable }));
vi.mock("@/lib/ai/embed", () => ({ embedQuery: mocks.embedQuery }));

import { searchKnowledge } from "./search";

const found = (title: string) => ({
  items: [{ id: "11111111-1111-4111-8111-111111111111", kind: "article", title, summary: "", sectionName: "Οδηγοί" }],
});

beforeEach(() => {
  vi.spyOn(console, "error").mockImplementation(() => undefined);
  mocks.rpc.mockImplementation(async (name: string) => ({
    data: found(name === "knowledge_search_hybrid" ? "hybrid" : "λέξεις"),
    error: null,
  }));
});
afterEach(() => vi.clearAllMocks());

const titleOf = (result: Awaited<ReturnType<typeof searchKnowledge>>) => (result.ok ? result.data.items[0]?.title : null);

describe("searchKnowledge (A8)", () => {
  it("με AI: hybrid search με το embedding της ερώτησης (σκοπός search, κοινό του Χρήστη)", async () => {
    mocks.aiAvailable.mockReturnValue(true);
    mocks.embedQuery.mockResolvedValue([0.5, 0.25]);
    expect(titleOf(await searchKnowledge("Γύρισμα", "client"))).toBe("hybrid");
    expect(mocks.embedQuery).toHaveBeenCalledWith("Γύρισμα", { purpose: "search", audience: "client" });
    expect(mocks.rpc).toHaveBeenCalledWith("knowledge_search_hybrid", { p_q: "Γύρισμα", p_embedding: "[0.5,0.25]" });
  });

  it("χωρίς AI: μόνο λέξεις, χωρίς embedding", async () => {
    mocks.aiAvailable.mockReturnValue(false);
    expect(titleOf(await searchKnowledge("Γύρισμα", "team"))).toBe("λέξεις");
    expect(mocks.embedQuery).not.toHaveBeenCalled();
  });

  it("αποτυχία του embedding: μόνο λέξεις, χωρίς σφάλμα στον χρήστη", async () => {
    mocks.aiAvailable.mockReturnValue(true);
    mocks.embedQuery.mockRejectedValue(new Error("Gateway down"));
    expect(titleOf(await searchKnowledge("Γύρισμα", "team"))).toBe("λέξεις");
  });

  it("αποτυχία του hybrid RPC: μόνο λέξεις", async () => {
    mocks.aiAvailable.mockReturnValue(true);
    mocks.embedQuery.mockResolvedValue([0.5]);
    mocks.rpc.mockImplementation(async (name: string) =>
      name === "knowledge_search_hybrid" ? { data: null, error: { message: "boom" } } : { data: found("λέξεις"), error: null },
    );
    expect(titleOf(await searchKnowledge("Γύρισμα", "team"))).toBe("λέξεις");
  });
});
