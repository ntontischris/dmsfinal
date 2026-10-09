import { createHmac } from "node:crypto";

import { NextRequest } from "next/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import { POST } from "./route";

const KEY = Buffer.from("hook-test-key-bytes-only-for-tests");
const SECRET = `v1,whsec_${KEY.toString("base64")}`;

const payload = (type: string) =>
  JSON.stringify({
    user: { email: "maria@example.com", user_metadata: { name: "Μαρία", locale: "el" } },
    email_data: { token_hash: "abc123", email_action_type: type, redirect_to: "" },
  });

const signedHeaders = (body: string, options: { key?: Buffer; timestamp?: number } = {}) => {
  const timestamp = String(options.timestamp ?? Math.floor(Date.now() / 1000));
  const digest = createHmac("sha256", options.key ?? KEY).update(`msg_1.${timestamp}.${body}`).digest("base64");
  return { "webhook-id": "msg_1", "webhook-timestamp": timestamp, "webhook-signature": `v1,${digest}` };
};

const hookRequest = (body: string, headers: Record<string, string>) =>
  new NextRequest("http://localhost:3000/api/hooks/send-email", { method: "POST", body, headers });

beforeEach(() => {
  vi.stubEnv("SEND_EMAIL_HOOK_SECRET", SECRET);
  vi.stubEnv("RESEND_API_KEY", "");
  vi.spyOn(console, "error").mockImplementation(() => undefined);
});

afterEach(() => vi.unstubAllEnvs());

describe("POST /api/hooks/send-email", () => {
  it("απαντά 500 όταν λείπει το μυστικό του hook", async () => {
    vi.stubEnv("SEND_EMAIL_HOOK_SECRET", "");
    const body = payload("invite");
    expect((await POST(hookRequest(body, signedHeaders(body)))).status).toBe(500);
  });

  it("απαντά 401 όταν η υπογραφή δεν ταιριάζει", async () => {
    const body = payload("invite");
    const headers = signedHeaders(body, { key: Buffer.from("άλλο κλειδί") });
    expect((await POST(hookRequest(body, headers))).status).toBe(401);
  });

  it("απαντά 401 όταν το timestamp είναι παλιότερο των 5 λεπτών", async () => {
    const body = payload("invite");
    const headers = signedHeaders(body, { timestamp: Math.floor(Date.now() / 1000) - 600 });
    expect((await POST(hookRequest(body, headers))).status).toBe(401);
  });

  it("απαντά 400 σε τύπο email που δεν στέλνεται (αλλαγή διεύθυνσης)", async () => {
    const body = payload("email_change");
    expect((await POST(hookRequest(body, signedHeaders(body)))).status).toBe(400);
  });

  it("απαντά 200 με {} όταν στέλνει την πρόσκληση", async () => {
    const body = payload("invite");
    const response = await POST(hookRequest(body, signedHeaders(body)));
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({});
  });
});
