import "server-only";

import { anthropic } from "@ai-sdk/anthropic";
import { google } from "@ai-sdk/google";
import { openai } from "@ai-sdk/openai";
import { createProviderRegistry, type EmbeddingModel, type LanguageModel } from "ai";

import { AI_MODELS, type AiModelId } from "./config";

// Οι πάροχοι AI, κατευθείαν (ADR 0016, τροποποίηση 2026-10-13). Κάθε πάροχος διαβάζει το κλειδί του από το περιβάλλον τη
// στιγμή της κλήσης (OPENAI_API_KEY, ANTHROPIC_API_KEY, GOOGLE_GENERATIVE_AI_API_KEY). Ένα id «πάροχος/μοντέλο» → μοντέλο.
const registry = createProviderRegistry({ openai, anthropic, google }, { separator: "/" });

export const languageModel = (id: AiModelId = AI_MODELS.chat): LanguageModel =>
  registry.languageModel(id as Parameters<typeof registry.languageModel>[0]);

export const embeddingModel = (id: AiModelId = AI_MODELS.embedding): EmbeddingModel =>
  registry.embeddingModel(id as Parameters<typeof registry.embeddingModel>[0]);
