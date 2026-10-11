import { createSign } from "node:crypto";

// Η υπογεγραμμένη βεβαίωση (JWT RS256) για την ανταλλαγή με διακριτικό πρόσβασης του Google.
export const GOOGLE_CALENDAR_SCOPE = "https://www.googleapis.com/auth/calendar";
export const GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token";
const ASSERTION_LIFETIME_SECONDS = 3600;

interface AssertionInput {
  email: string;
  privateKey: string;
  nowSeconds: number;
}

const base64Url = (value: string): string => Buffer.from(value).toString("base64url");

export function buildServiceAssertion({ email, privateKey, nowSeconds }: AssertionInput): string {
  const header = base64Url(JSON.stringify({ alg: "RS256", typ: "JWT" }));
  const claims = base64Url(
    JSON.stringify({
      iss: email,
      scope: GOOGLE_CALENDAR_SCOPE,
      aud: GOOGLE_TOKEN_URL,
      iat: nowSeconds,
      exp: nowSeconds + ASSERTION_LIFETIME_SECONDS,
    }),
  );
  const unsigned = `${header}.${claims}`;
  const signature = createSign("RSA-SHA256").update(unsigned).sign(privateKey, "base64url");
  return `${unsigned}.${signature}`;
}
