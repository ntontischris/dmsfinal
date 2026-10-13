import { describe, expect, it } from "vitest";

import { AI_MODELS, costMicros } from "./config";
import { aiAvailableFrom } from "./available";

describe("costMicros", () => {
  it("embeddings: 0,02 $ ανά 1M tokens = 0,02 μικρο-δολάρια ανά token, προς τα πάνω", () => {
    expect(costMicros(AI_MODELS.embedding, 1000)).toBe(20);
    expect(costMicros(AI_MODELS.embedding, 1)).toBe(1);
    expect(costMicros(AI_MODELS.embedding, 0)).toBe(0);
  });

  it("chat: είσοδος και έξοδος με διαφορετική τιμή", () => {
    expect(costMicros(AI_MODELS.chat, 1000, 500)).toBe(400 + 800);
  });

  it("άγνωστο μοντέλο: σφάλμα αντί για μηδέν κόστος", () => {
    expect(() => costMicros("acme/unknown", 10)).toThrow();
  });
});

describe("aiAvailableFrom", () => {
  it("τοπικά και στο CI χωρίς Gateway: όχι", () => {
    expect(aiAvailableFrom({})).toBe(false);
  });

  it("στο Vercel (OIDC) ή με κλειδί Gateway: ναι", () => {
    expect(aiAvailableFrom({ VERCEL: "1" })).toBe(true);
    expect(aiAvailableFrom({ VERCEL_OIDC_TOKEN: "x" })).toBe(true);
    expect(aiAvailableFrom({ AI_GATEWAY_API_KEY: "x" })).toBe(true);
  });
});
