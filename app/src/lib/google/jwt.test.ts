import { createVerify, generateKeyPairSync } from "node:crypto";
import { describe, expect, it } from "vitest";

import { buildServiceAssertion, GOOGLE_CALENDAR_SCOPE, GOOGLE_TOKEN_URL } from "./jwt";

const { privateKey, publicKey } = generateKeyPairSync("rsa", { modulusLength: 2048 });
const pem = privateKey.export({ type: "pkcs8", format: "pem" }).toString();
const NOW = 1_800_000_000;

const decodePart = (part: string) => JSON.parse(Buffer.from(part, "base64url").toString("utf8"));

describe("buildServiceAssertion", () => {
  it("builds an RS256 assertion with the calendar scope and token audience", () => {
    const assertion = buildServiceAssertion({ email: "svc@example.iam", privateKey: pem, nowSeconds: NOW });
    const [header, claims] = assertion.split(".");
    expect(decodePart(header)).toEqual({ alg: "RS256", typ: "JWT" });
    expect(decodePart(claims)).toEqual({
      iss: "svc@example.iam",
      scope: GOOGLE_CALENDAR_SCOPE,
      aud: GOOGLE_TOKEN_URL,
      iat: NOW,
      exp: NOW + 3600,
    });
  });

  it("signs the header and claims so that the public key verifies them", () => {
    const assertion = buildServiceAssertion({ email: "svc@example.iam", privateKey: pem, nowSeconds: NOW });
    const signed = assertion.slice(0, assertion.lastIndexOf("."));
    const signature = assertion.slice(assertion.lastIndexOf(".") + 1);
    const verifier = createVerify("RSA-SHA256").update(signed);
    expect(verifier.verify(publicKey, signature, "base64url")).toBe(true);
  });
});
