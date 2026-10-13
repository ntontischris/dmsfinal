import { AI_MODELS, type AiModelId, type AiProvider } from "./config";

// Υπάρχει το κλειδί του παρόχου που χρειάζεται μια χρήση AI; (embedding → ο πάροχος του embedding· chat → ο πάροχος του chat)
// Τοπικά και στο CI δεν υπάρχουν κλειδιά: η ουρά μένει «σε αναμονή», η αναζήτηση πέφτει σε full-text και ο Βοηθός λέει
// «δεν είναι διαθέσιμος τώρα». Το πλαφόν ελέγχεται χωριστά (budget.ts).
export type AiUse = "embedding" | "chat";

export const PROVIDER_KEY_ENV: Readonly<Record<AiProvider, string>> = {
  openai: "OPENAI_API_KEY",
  anthropic: "ANTHROPIC_API_KEY",
  google: "GOOGLE_GENERATIVE_AI_API_KEY",
};

export const providerOf = (model: AiModelId): AiProvider =>
  model.slice(0, model.indexOf("/")) as AiProvider;

const modelFor = (use: AiUse): AiModelId =>
  use === "embedding" ? AI_MODELS.embedding : AI_MODELS.chat;

export function aiConfiguredFrom(
  env: Readonly<Record<string, string | undefined>>,
  use: AiUse,
): boolean {
  return Boolean(env[PROVIDER_KEY_ENV[providerOf(modelFor(use))]]);
}

export const aiConfigured = (use: AiUse): boolean =>
  aiConfiguredFrom(process.env, use);
