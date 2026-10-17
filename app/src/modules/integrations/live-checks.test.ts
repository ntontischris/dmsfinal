import { describe, expect, it, vi } from "vitest";

import { connectionStatuses } from "./connections";
import { configuredFrom, usesFakeProviders } from "./environment";
import { runLiveCheck, usedAiProviders } from "./live-checks";
import type { IntegrationsFacts } from "./schemas";

// Φανταστικές τιμές· δεν μοιάζουν με πραγματικά κλειδιά.
const SECRET = "SECRET-VALUE-do-not-leak-123";
const ENV = {
  RESEND_API_KEY: SECRET,
  OPENAI_API_KEY: SECRET,
  ANTHROPIC_API_KEY: SECRET,
  GOOGLE_GENERATIVE_AI_API_KEY: SECRET,
  GOOGLE_SERVICE_ACCOUNT_EMAIL: "dms@example.iam.gserviceaccount.com",
  GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY: SECRET,
};

const reply = (status: number, body: unknown = {}) =>
  vi.fn(
    async () => new Response(JSON.stringify(body), { status }),
  ) as unknown as typeof fetch;

describe("runLiveCheck", () => {
  it("Resend: GET στα domains με το κλειδί στην κεφαλίδα· επιτυχία", async () => {
    const fetchImpl = reply(200, { data: [] });
    expect(await runLiveCheck("email", { env: ENV, fetchImpl })).toEqual({
      isOk: true,
    });
    expect(fetchImpl).toHaveBeenCalledWith(
      "https://api.resend.com/domains",
      expect.objectContaining({ method: "GET" }),
    );
  });

  it("Resend: κλειδί μόνο αποστολής (restricted_api_key) = το κλειδί ισχύει", async () => {
    const fetchImpl = reply(401, {
      name: "restricted_api_key",
      message: SECRET,
    });
    expect(await runLiveCheck("email", { env: ENV, fetchImpl })).toEqual({
      isOk: true,
    });
  });

  it("αποτυχία: μόνο πάροχος και κωδικός, ποτέ το κλειδί ή το σώμα της απάντησης", async () => {
    const fetchImpl = reply(403, {
      name: "invalid_api_key",
      message: `bad key ${SECRET}`,
    });
    const email = await runLiveCheck("email", { env: ENV, fetchImpl });
    const ai = await runLiveCheck("ai", { env: ENV, fetchImpl });
    expect(email).toEqual({ isOk: false, error: "Resend 403" });
    expect(ai.isOk).toBe(false);
    expect(JSON.stringify([email, ai])).not.toContain(SECRET);
  });

  it("σφάλμα δικτύου: χωρίς λεπτομέρειες", async () => {
    const fetchImpl = vi.fn(async () => {
      throw new Error(`connect ECONNREFUSED ${SECRET}`);
    }) as unknown as typeof fetch;
    const outcome = await runLiveCheck("email", { env: ENV, fetchImpl });
    expect(outcome).toEqual({ isOk: false, error: "Resend: σφάλμα δικτύου" });
  });

  it("AI: μία κλήση στη λίστα μοντέλων για κάθε πάροχο που χρησιμοποιεί ο κώδικας", async () => {
    const fetchImpl = reply(200, { data: [] });
    expect(await runLiveCheck("ai", { env: ENV, fetchImpl })).toEqual({
      isOk: true,
    });
    expect(fetchImpl).toHaveBeenCalledTimes(usedAiProviders().length);
  });

  it("ψεύτικος πάροχος (e2e): επιτυχία χωρίς καμία κλήση δικτύου, ποτέ στην παραγωγή", async () => {
    const fetchImpl = reply(500);
    const env = { INTEGRATIONS_FAKE_PROVIDERS: "1" };
    for (const id of ["email", "ai", "google"] as const)
      expect(await runLiveCheck(id, { env, fetchImpl })).toEqual({
        isOk: true,
      });
    expect(fetchImpl).not.toHaveBeenCalled();
    expect(usesFakeProviders({ ...env, VERCEL_ENV: "production" })).toBe(false);
    expect(configuredFrom({ ...env, VERCEL_ENV: "production" })).toEqual({
      google: false,
      email: false,
      ai: false,
    });
  });
});

describe("κανένα μυστικό δεν φεύγει από τον server", () => {
  it("configuredFrom: μόνο ναι/όχι", () => {
    const configured = configuredFrom(ENV);
    expect(configured).toEqual({ google: true, email: true, ai: true });
    expect(JSON.stringify(configured)).not.toContain(SECRET);
  });

  it("οι κάρτες που φτάνουν στον browser δεν έχουν καμία τιμή του περιβάλλοντος", () => {
    const facts: IntegrationsFacts = {
      now: "2026-10-20T10:00:00.000Z",
      email: {
        jobOkAt: null,
        jobErrorAt: null,
        jobError: null,
        lastSentAt: null,
        sentToday: 0,
        failedToday: 0,
      },
      google: {
        calendarConnected: false,
        lastSyncAt: null,
        lastError: null,
        errorSince: null,
        pendingWrites: 0,
        jobOkAt: null,
      },
      ai: {
        month: "2026-10",
        spentMicros: 0,
        capMicros: 30_000_000,
        lastUsedAt: null,
      },
      checks: {},
      analytics: { ga4: "", pixel: "" },
    };
    const json = JSON.stringify(connectionStatuses(facts, configuredFrom(ENV)));
    expect(json).not.toContain(SECRET);
    expect(json).not.toContain("gserviceaccount");
  });
});
