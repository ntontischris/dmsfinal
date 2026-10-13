import { describe, expect, it } from "vitest";

import { AI_MODELS, AI_PRICES, costMicros } from "./config";
import { aiConfiguredFrom, providerOf } from "./available";

describe("costMicros", () => {
  it("embeddings: 0,02 $ ανά 1M tokens = 0,02 μικρο-δολάρια ανά token, προς τα πάνω", () => {
    expect(costMicros(AI_MODELS.embedding, 1000)).toBe(20);
    expect(costMicros(AI_MODELS.embedding, 1)).toBe(1);
    expect(costMicros(AI_MODELS.embedding, 0)).toBe(0);
  });

  it("chat: είσοδος και έξοδος με διαφορετική τιμή", () => {
    expect(costMicros("openai/gpt-4.1-mini", 1000, 500)).toBe(400 + 800);
  });

  it("τα μοντέλα των ρυθμίσεων και παραδείγματα από κάθε πάροχο έχουν τιμή", () => {
    for (const model of Object.values(AI_MODELS)) expect(AI_PRICES[model], model).toBeDefined();
    for (const provider of ["openai", "anthropic", "google"]) {
      expect(Object.keys(AI_PRICES).some((id) => id.startsWith(`${provider}/`))).toBe(true);
    }
  });

  it("άγνωστο μοντέλο: σφάλμα αντί για μηδέν κόστος", () => {
    expect(() => costMicros("acme/unknown", 10)).toThrow();
  });
});

describe("aiConfiguredFrom", () => {
  it("τοπικά και στο CI χωρίς κλειδιά: όχι", () => {
    expect(aiConfiguredFrom({}, "embedding")).toBe(false);
    expect(aiConfiguredFrom({}, "chat")).toBe(false);
  });

  it("embedding: θέλει το κλειδί του παρόχου του embedding (OpenAI)", () => {
    expect(aiConfiguredFrom({ OPENAI_API_KEY: "x" }, "embedding")).toBe(true);
    expect(aiConfiguredFrom({ ANTHROPIC_API_KEY: "x", GOOGLE_GENERATIVE_AI_API_KEY: "x" }, "embedding")).toBe(false);
  });

  it("chat: θέλει το κλειδί του παρόχου του chat", () => {
    const key = {
      openai: "OPENAI_API_KEY",
      anthropic: "ANTHROPIC_API_KEY",
      google: "GOOGLE_GENERATIVE_AI_API_KEY",
    }[providerOf(AI_MODELS.chat)];
    expect(aiConfiguredFrom({ [key]: "x" }, "chat")).toBe(true);
  });

  it("providerOf: το πρώτο μέρος του id", () => {
    expect(providerOf("anthropic/claude-haiku-4-5")).toBe("anthropic");
    expect(providerOf("google/gemini-2.5-flash")).toBe("google");
  });
});
