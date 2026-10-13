import "server-only";

import { embed, embedMany, type EmbeddingModel } from "ai";

import { AI_MODELS, type AiAudience, type AiPurpose } from "./config";
import { recordUsage } from "./usage";

// Embeddings μέσω του Gateway, με καταγραφή κόστους σε κάθε κλήση. Το model αλλάζει μόνο στα τεστ (mock από «ai/test»).

export interface EmbedOptions {
  purpose: AiPurpose;
  audience: AiAudience;
  model?: EmbeddingModel;
  abortSignal?: AbortSignal;
}

// Μία κλήση στο Gateway ανά παρτίδα, με καταγραφή αμέσως μετά: αν αποτύχει μια επόμενη, το κόστος των προηγούμενων μένει.
export const EMBED_BATCH = 100;

export async function embedTexts(
  values: readonly string[],
  options: EmbedOptions,
): Promise<number[][]> {
  const embeddings: number[][] = [];
  for (let start = 0; start < values.length; start += EMBED_BATCH) {
    const result = await embedMany({
      model: options.model ?? AI_MODELS.embedding,
      values: values.slice(start, start + EMBED_BATCH),
      maxRetries: 1,
      abortSignal: options.abortSignal,
    });
    await recordUsage({
      purpose: options.purpose,
      model: AI_MODELS.embedding,
      inputTokens: result.usage.tokens,
      audience: options.audience,
    });
    embeddings.push(...result.embeddings);
  }
  return embeddings;
}

export async function embedQuery(
  value: string,
  options: EmbedOptions,
): Promise<number[]> {
  const result = await embed({
    model: options.model ?? AI_MODELS.embedding,
    value,
    maxRetries: 1,
    abortSignal: options.abortSignal,
  });
  await recordUsage({
    purpose: options.purpose,
    model: AI_MODELS.embedding,
    inputTokens: result.usage.tokens,
    audience: options.audience,
  });
  return result.embedding;
}
