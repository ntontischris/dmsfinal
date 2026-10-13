import "server-only";

import { embed, embedMany, type EmbeddingModel } from "ai";

import { AI_MODELS, type AiAudience, type AiPurpose } from "./config";
import { recordUsage } from "./usage";

// Embeddings μέσω του Gateway, με καταγραφή κόστους σε κάθε κλήση. Το model αλλάζει μόνο στα τεστ (mock από «ai/test»).

export interface EmbedOptions {
  purpose: AiPurpose;
  audience: AiAudience;
  model?: EmbeddingModel;
}

export async function embedTexts(
  values: readonly string[],
  options: EmbedOptions,
): Promise<number[][]> {
  const result = await embedMany({
    model: options.model ?? AI_MODELS.embedding,
    values: [...values],
    maxRetries: 1,
  });
  await recordUsage({
    purpose: options.purpose,
    model: AI_MODELS.embedding,
    inputTokens: result.usage.tokens,
    audience: options.audience,
  });
  return result.embeddings;
}

export async function embedQuery(
  value: string,
  options: EmbedOptions,
): Promise<number[]> {
  const result = await embed({
    model: options.model ?? AI_MODELS.embedding,
    value,
    maxRetries: 1,
  });
  await recordUsage({
    purpose: options.purpose,
    model: AI_MODELS.embedding,
    inputTokens: result.usage.tokens,
    audience: options.audience,
  });
  return result.embedding;
}
