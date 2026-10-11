import { generateKeyPairSync } from "node:crypto";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { readGoogleConfig } from "./config";
import { clearAccessTokenCache, getAccessToken } from "./token";

const { privateKey } = generateKeyPairSync("rsa", { modulusLength: 2048 });
const pem = privateKey.export({ type: "pkcs8", format: "pem" }).toString();
const config = { email: "svc@example.iam", privateKey: pem };

const tokenResponse = (accessToken: string, expiresIn = 3600) =>
  new Response(
    JSON.stringify({ access_token: accessToken, expires_in: expiresIn }),
    { status: 200 },
  );

beforeEach(() => {
  clearAccessTokenCache();
  vi.stubGlobal(
    "fetch",
    vi.fn(async () => tokenResponse("tok-1")),
  );
});

afterEach(() => vi.unstubAllGlobals());

describe("getAccessToken", () => {
  it("exchanges the assertion once and reuses the token until it nears expiry", async () => {
    const now = 1_800_000_000_000;
    expect(await getAccessToken(config, now)).toBe("tok-1");
    expect(await getAccessToken(config, now + 1000)).toBe("tok-1");
    expect(fetch).toHaveBeenCalledTimes(1);
  });

  it("asks again once the token is within a minute of expiry", async () => {
    const now = 1_800_000_000_000;
    vi.mocked(fetch)
      .mockResolvedValueOnce(tokenResponse("tok-1", 3600))
      .mockResolvedValueOnce(tokenResponse("tok-2"));
    await getAccessToken(config, now);
    expect(await getAccessToken(config, now + 3600 * 1000 - 30_000)).toBe(
      "tok-2",
    );
    expect(fetch).toHaveBeenCalledTimes(2);
  });

  it("throws without the token value when the exchange fails", async () => {
    vi.mocked(fetch).mockResolvedValueOnce(
      new Response("nope", { status: 401 }),
    );
    await expect(getAccessToken(config, 1_800_000_000_000)).rejects.toThrow(
      "google token 401",
    );
  });
});

describe("readGoogleConfig", () => {
  it("returns null when either variable is missing", () => {
    expect(
      readGoogleConfig({ GOOGLE_SERVICE_ACCOUNT_EMAIL: "svc@example.iam" }),
    ).toBeNull();
    expect(readGoogleConfig({})).toBeNull();
  });

  it("turns escaped newlines in the key into real line breaks", () => {
    const parsed = readGoogleConfig({
      GOOGLE_SERVICE_ACCOUNT_EMAIL: "svc@example.iam",
      GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY: "line-a\\nline-b",
    });
    expect(parsed?.privateKey).toBe("line-a\nline-b");
  });
});
