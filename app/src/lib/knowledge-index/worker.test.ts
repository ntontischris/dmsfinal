import type { SupabaseClient } from "@supabase/supabase-js";
import { MockEmbeddingModelV3 } from "ai/test";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ recordUsage: vi.fn() }));
vi.mock("@/lib/ai/usage", () => ({ recordUsage: mocks.recordUsage }));

import { runKnowledgeIndex } from "./worker";

const ITEM = "11111111-1111-4111-8111-111111111111";
const article = {
  itemId: ITEM,
  version: 3,
  kind: "article",
  title: "Πώς κλείνω Γύρισμα",
  summary: "Τα βήματα της Κράτησης.",
  sectionName: "Οδηγοί",
  body: "Ανοίγεις την Κράτηση και διαλέγεις μέρα.",
  storagePath: null,
  mime: null,
  attempts: 0,
};

const embedModel = () =>
  new MockEmbeddingModelV3({
    doEmbed: async ({ values }) => ({
      embeddings: values.map(() => [0.1, 0.2]),
      usage: { tokens: 42 },
      warnings: [],
    }),
  });

// Η ουρά έχει ένα στοιχείο: το πρώτο claim το δίνει, τα επόμενα βρίσκουν την ουρά άδεια.
function fakeAdmin(rpc = vi.fn()) {
  let claimed = false;
  rpc.mockImplementation(async (name: string) => {
    if (name === "knowledge_index_claim") {
      const items = claimed ? [] : [article];
      claimed = true;
      return { data: { items }, error: null };
    }
    if (name === "knowledge_index_store") return { data: { stored: true, chunks: 1 }, error: null };
    return { data: null, error: null };
  });
  return { admin: { rpc } as unknown as SupabaseClient, rpc };
}

beforeEach(() => vi.spyOn(console, "error").mockImplementation(() => undefined));
afterEach(() => {
  vi.unstubAllEnvs();
  vi.clearAllMocks();
});

describe("runKnowledgeIndex", () => {
  it("χωρίς Gateway: δεν παίρνει τίποτα από την ουρά (μένουν «σε αναμονή»)", async () => {
    vi.stubEnv("VERCEL", "");
    vi.stubEnv("VERCEL_OIDC_TOKEN", "");
    vi.stubEnv("AI_GATEWAY_API_KEY", "");
    const { admin, rpc } = fakeAdmin();
    expect(await runKnowledgeIndex(admin)).toEqual({ skipped: "ai-unavailable", indexed: 0, stale: 0, failed: 0 });
    expect(rpc).not.toHaveBeenCalled();
  });

  it("γράφει κομμάτια με κεφαλίδα και embedding, και καταγράφει το κόστος (embed)", async () => {
    const { admin, rpc } = fakeAdmin();
    expect(await runKnowledgeIndex(admin, { model: embedModel() })).toEqual({ indexed: 1, stale: 0, failed: 0 });
    const store = rpc.mock.calls.find(([name]) => name === "knowledge_index_store")?.[1];
    expect(store).toMatchObject({ p_item: ITEM, p_version: 3, p_text_status: null, p_model: "openai/text-embedding-3-small" });
    expect(store.p_chunks).toEqual([
      {
        content: "Οδηγοί · Πώς κλείνω Γύρισμα · Τα βήματα της Κράτησης.\n\nΑνοίγεις την Κράτηση και διαλέγεις μέρα.",
        embedding: [0.1, 0.2],
      },
    ]);
    expect(mocks.recordUsage).toHaveBeenCalledWith({
      purpose: "embed",
      model: "openai/text-embedding-3-small",
      inputTokens: 42,
      audience: "team",
    });
  });

  it("η άμεση προσπάθεια ζητά μόνο το στοιχείο της", async () => {
    const { admin, rpc } = fakeAdmin();
    await runKnowledgeIndex(admin, { model: embedModel(), itemId: ITEM, limit: 1 });
    expect(rpc).toHaveBeenCalledWith("knowledge_index_claim", { p_limit: 1, p_item: ITEM });
  });

  it("αποτυχία του Gateway: knowledge_index_fail με το σφάλμα, χωρίς να σκάει", async () => {
    const { admin, rpc } = fakeAdmin();
    const failing = new MockEmbeddingModelV3({
      doEmbed: async () => {
        throw new Error("Gateway down");
      },
    });
    expect(await runKnowledgeIndex(admin, { model: failing })).toEqual({ indexed: 0, stale: 0, failed: 1 });
    expect(rpc).toHaveBeenCalledWith("knowledge_index_fail", { p_item: ITEM, p_version: 3, p_error: "Gateway down" });
  });

  it("στοιχείο που κολλά: κόβεται στο χρονικό όριο και γράφεται ως αποτυχία", async () => {
    const { admin, rpc } = fakeAdmin();
    const hanging = new MockEmbeddingModelV3({ doEmbed: () => new Promise(() => undefined) });
    expect(await runKnowledgeIndex(admin, { model: hanging, itemTimeoutMs: 10 })).toEqual({ indexed: 0, stale: 0, failed: 1 });
    expect(rpc).toHaveBeenCalledWith("knowledge_index_fail", { p_item: ITEM, p_version: 3, p_error: "Χρονικό όριο 0s" });
  });

  it("μετά το χρονικό περιθώριο του γύρου δεν παίρνει νέο στοιχείο", async () => {
    const { admin, rpc } = fakeAdmin();
    expect(await runKnowledgeIndex(admin, { model: embedModel(), budgetMs: -1 })).toEqual({ indexed: 0, stale: 0, failed: 0 });
    expect(rpc).not.toHaveBeenCalled();
  });

  it("παίρνει ένα στοιχείο τη φορά ώσπου να αδειάσει η ουρά", async () => {
    const { admin, rpc } = fakeAdmin();
    await runKnowledgeIndex(admin, { model: embedModel() });
    expect(rpc.mock.calls.filter(([name]) => name === "knowledge_index_claim")).toEqual([
      ["knowledge_index_claim", { p_limit: 1, p_item: null }],
      ["knowledge_index_claim", { p_limit: 1, p_item: null }],
    ]);
  });

  it("το στοιχείο άλλαξε στο μεταξύ: μετρά ως παλιό, δεν είναι αποτυχία", async () => {
    const { admin, rpc } = fakeAdmin();
    rpc.mockImplementation(async (name: string) =>
      name === "knowledge_index_claim"
        ? { data: { items: rpc.mock.calls.length === 1 ? [article] : [] }, error: null }
        : { data: { stored: false }, error: null },
    );
    expect(await runKnowledgeIndex(admin, { model: embedModel() })).toEqual({ indexed: 0, stale: 1, failed: 0 });
  });
});
