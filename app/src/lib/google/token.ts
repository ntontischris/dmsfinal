import { z } from "zod";

import { buildServiceAssertion, GOOGLE_TOKEN_URL } from "./jwt";
import type { GoogleConfig } from "./config";

// Διακριτικό πρόσβασης, με cache στη μνήμη μέχρι λίγο πριν τη λήξη του. Δεν φεύγει ποτέ στα logs.
const REFRESH_MARGIN_MS = 60_000;
const TOKEN_TIMEOUT_MS = 10_000;

const tokenResponseSchema = z.object({
  access_token: z.string().min(1),
  expires_in: z.number().positive(),
});

interface CachedToken {
  value: string;
  expiresAt: number;
}

let cached: CachedToken | null = null;

export function clearAccessTokenCache(): void {
  cached = null;
}

const isFresh = (token: CachedToken | null, now: number): token is CachedToken =>
  token !== null && token.expiresAt - REFRESH_MARGIN_MS > now;

export async function getAccessToken(config: GoogleConfig, now: number = Date.now()): Promise<string> {
  if (isFresh(cached, now)) return cached.value;
  const assertion = buildServiceAssertion({
    email: config.email,
    privateKey: config.privateKey,
    nowSeconds: Math.floor(now / 1000),
  });
  const response = await fetch(GOOGLE_TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion,
    }),
    signal: AbortSignal.timeout(TOKEN_TIMEOUT_MS),
  });
  if (!response.ok) throw new Error(`google token ${response.status}`);
  const parsed = tokenResponseSchema.parse(await response.json());
  cached = { value: parsed.access_token, expiresAt: now + parsed.expires_in * 1000 };
  return cached.value;
}
