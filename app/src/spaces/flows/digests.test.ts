import { describe, expect, it } from "vitest";

import type { NeedRow } from "@/modules/messages";

import { apantoDigest, egkrinoDigest, parseCardRead } from "./digests";

const need = (over: Partial<NeedRow> = {}): NeedRow => ({
  key: "/app/messages/c1",
  clientId: "c1",
  who: "Πελάτης Α",
  since: "2026-11-15T08:00:00Z",
  kind: "reply",
  href: "/app/messages/c1",
  ...over,
});

describe("apantoDigest", () => {
  it("should count the same rows as «Χρειάζονται εμένα», oldest named", () => {
    const digest = apantoDigest([
      need(),
      need({
        clientId: "c2",
        who: "Πελάτης Β",
        since: "2026-11-14T08:00:00Z",
        kind: "request",
        href: "/app/messages/c2#m-1",
      }),
      need({ clientId: "c3", who: "Πελάτης Γ", kind: "mention" }),
    ]);
    expect(digest.count).toBe(3);
    expect(digest.oldest).toMatchObject({
      who: "Πελάτης Β",
      href: "/app/messages/c2#m-1",
    });
  });

  it("should be empty without reads", () => {
    expect(apantoDigest(null)).toEqual({
      job: "apanto-se-pelates",
      count: 0,
      oldest: null,
    });
  });
});

describe("egkrinoDigest", () => {
  it("should count like the guide itself and name the client from the title", () => {
    const approvals = parseCardRead({
      count: 2,
      items: [
        {
          title: "Ταβέρνα Χ: ζητά μετάθεση",
          at: "2026-11-20T09:00:00Z",
          waiting_since: "2026-11-12T09:00:00Z",
          link: "/app/filming/f1",
        },
        {
          title: "Καφέ Υ: νέα κράτηση",
          at: "2026-11-18T09:00:00Z",
          waiting_since: "2026-11-14T09:00:00Z",
          link: "/app/filming/f2",
        },
      ],
    });
    const digest = egkrinoDigest(approvals, 1);
    expect(digest.count).toBe(1);
    expect(egkrinoDigest(approvals, null).count).toBe(2);
    expect(digest.oldest).toEqual({
      who: "Ταβέρνα Χ",
      since: "2026-11-12T09:00:00Z",
      day: "2026-11-20T09:00:00Z",
      href: "/app/filming/f1",
    });
  });

  it("should reject a malformed read", () => {
    expect(() => parseCardRead({ count: -1, items: [] })).toThrow();
  });
});
