import { MockEmbeddingModelV3 } from "ai/test";
import { afterEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ recordUsage: vi.fn() }));
vi.mock("./usage", () => ({ recordUsage: mocks.recordUsage }));

import { EMBED_BATCH, embedTexts } from "./embed";

afterEach(() => vi.clearAllMocks());

describe("embedTexts", () => {
  it("καταγράφει το κόστος κάθε επιτυχημένης παρτίδας, ακόμα κι αν μια επόμενη αποτύχει", async () => {
    let calls = 0;
    const model = new MockEmbeddingModelV3({
      maxEmbeddingsPerCall: EMBED_BATCH,
      doEmbed: async ({ values }) => {
        calls += 1;
        if (calls === 2) throw new Error("Gateway down");
        return {
          embeddings: values.map(() => [0.1]),
          usage: { tokens: 7 },
          warnings: [],
        };
      },
    });
    const values = Array.from(
      { length: EMBED_BATCH + 1 },
      (_, i) => `κομμάτι ${i}`,
    );
    await expect(
      embedTexts(values, { purpose: "embed", audience: "team", model }),
    ).rejects.toThrow("Gateway down");
    expect(mocks.recordUsage).toHaveBeenCalledTimes(1);
    expect(mocks.recordUsage).toHaveBeenCalledWith({
      purpose: "embed",
      model: "openai/text-embedding-3-small",
      inputTokens: 7,
      audience: "team",
    });
  });
});
