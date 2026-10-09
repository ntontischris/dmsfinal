import { describe, expect, it } from "vitest";

import { buildAuthEmail, confirmLink, parseAuthHookPayload } from "./auth-hook";

const ORIGIN = "https://dmsfinal-app.vercel.app";

const build = (raw: unknown) => {
  const parsed = parseAuthHookPayload(raw);
  if (!parsed.success) throw new Error("σώμα μη έγκυρο στο τεστ");
  return buildAuthEmail(parsed.data, ORIGIN);
};

const payload = (type: string, metadata: Record<string, unknown> = {}) => ({
  user: { email: "maria@example.com", user_metadata: metadata },
  email_data: { token_hash: "abc123", email_action_type: type, redirect_to: "", site_url: ORIGIN },
});

describe("parseAuthHookPayload", () => {
  it("δέχεται το σχήμα της Supabase", () => {
    expect(parseAuthHookPayload(payload("invite")).success).toBe(true);
  });

  it("απορρίπτει σώμα χωρίς παραλήπτη", () => {
    expect(parseAuthHookPayload({ email_data: { token_hash: "x", email_action_type: "invite" } }).success).toBe(false);
  });
});

describe("buildAuthEmail", () => {
  it("χτίζει σύνδεσμο προς /auth/confirm με token_hash και τύπο", () => {
    expect(confirmLink(ORIGIN, "a+b", "magiclink")).toBe(`${ORIGIN}/auth/confirm?token_hash=a%2Bb&type=magiclink`);
  });

  it("στέλνει πρόσκληση ομάδας στα ελληνικά όταν λείπει η γλώσσα", () => {
    const email = build(payload("invite", { name: "Μαρία" }));
    expect(email?.message.subject).toBe("Πρόσκληση στο DMS: Devre Media");
    expect(email?.toName).toBe("Μαρία");
    expect(email?.message.text).toContain(`${ORIGIN}/auth/confirm?token_hash=abc123&type=invite`);
  });

  it("στέλνει πρόσκληση πελάτη στα αγγλικά με το όνομα του Πελάτη", () => {
    const email = build(payload("invite", { name: "Nick", locale: "en", kind: "client", client_name: "Acme" }));
    expect(email?.message.subject).toBe("Invitation to DMS: Acme");
  });

  it("χτίζει σύνδεσμο εισόδου για magiclink", () => {
    const email = build(payload("magiclink"));
    expect(email?.message.text).toContain(`${ORIGIN}/auth/confirm?token_hash=abc123&type=magiclink`);
  });

  it("επιστρέφει null για άγνωστο τύπο", () => {
    expect(build(payload("mystery"))).toBeNull();
  });
});
