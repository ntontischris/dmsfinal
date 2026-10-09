import { createHmac } from "node:crypto";

import { describe, expect, it } from "vitest";

import { verifyStandardWebhook } from "./standard-webhooks";

const KEY = Buffer.from("test-key-bytes-for-unit-tests-only");
const SECRET = `v1,whsec_${KEY.toString("base64")}`;
const NOW = 1_800_000_000;
const BODY = '{"user":{"email":"a@example.com"}}';

const signed = (overrides: { timestamp?: number; body?: string } = {}) => {
  const timestamp = String(overrides.timestamp ?? NOW);
  const body = overrides.body ?? BODY;
  const digest = createHmac("sha256", KEY).update(`msg_1.${timestamp}.${body}`).digest("base64");
  return { id: "msg_1", timestamp, signature: `v1,${digest}`, body, secret: SECRET, nowSeconds: NOW };
};

describe("verifyStandardWebhook", () => {
  it("δέχεται υπογραφή που ταιριάζει με το σώμα και το timestamp", () => {
    expect(verifyStandardWebhook(signed())).toEqual({ ok: true });
  });

  it("απορρίπτει υπογραφή όταν αλλάξει το σώμα", () => {
    expect(verifyStandardWebhook({ ...signed(), body: '{"user":{"email":"b@example.com"}}' })).toMatchObject({ ok: false });
  });

  it("απορρίπτει timestamp παλιότερο των 5 λεπτών", () => {
    expect(verifyStandardWebhook(signed({ timestamp: NOW - 301 }))).toMatchObject({ ok: false, reason: expect.stringContaining("timestamp") });
  });

  it("δέχεται timestamp μέσα στα 5 λεπτά", () => {
    expect(verifyStandardWebhook(signed({ timestamp: NOW - 300 }))).toEqual({ ok: true });
  });

  it("απορρίπτει αίτημα χωρίς κεφαλίδες", () => {
    expect(verifyStandardWebhook({ ...signed(), signature: null })).toMatchObject({ ok: false });
  });

  it("δέχεται μία έγκυρη υπογραφή ανάμεσα σε πολλές", () => {
    const good = signed();
    expect(verifyStandardWebhook({ ...good, signature: `v1,abc= ${good.signature}` })).toEqual({ ok: true });
  });
});
