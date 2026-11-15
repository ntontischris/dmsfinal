import { describe, expect, it } from "vitest";

import {
  apantoDigest,
  egkrinoDigest,
  parseCardRead,
  parseInboxRead,
  type CardRead,
  type InboxRead,
} from "./digests";

const thread = (over: Partial<InboxRead["items"][number]> = {}) => ({
  clientId: "c1",
  clientName: "Πελάτης Α",
  lastAt: "2026-11-15T08:00:00Z",
  lastInternal: false,
  unread: 1,
  ...over,
});

const card = (count: number, items: CardRead["items"]): CardRead => ({
  count,
  items,
});

describe("apantoDigest", () => {
  it("should count clients who wrote last and are unread, oldest first", () => {
    const inbox = parseInboxRead({
      items: [
        thread(),
        thread({
          clientId: "c2",
          clientName: "Πελάτης Β",
          lastAt: "2026-11-14T08:00:00Z",
        }),
        thread({ clientId: "c3", clientName: "Πελάτης Γ", lastInternal: true }),
        thread({ clientId: "c4", clientName: "Πελάτης Δ", unread: 0 }),
      ],
    });
    const digest = apantoDigest(inbox, null);
    expect(digest.count).toBe(2);
    expect(digest.oldest).toMatchObject({
      who: "Πελάτης Β",
      href: "/app/messages/c2",
    });
  });

  it("should count a client once and add unnamed requests", () => {
    const requests = card(4, [
      {
        title: "Αίτημα",
        subtitle: "Πελάτης Α",
        at: "2026-11-13T08:00:00Z",
        link: "/app/requests/r1",
      },
    ]);
    const digest = apantoDigest(
      parseInboxRead({ items: [thread()] }),
      requests,
    );
    expect(digest.count).toBe(1 + 3);
    expect(digest.oldest?.href).toBe("/app/requests/r1");
  });

  it("should be empty without reads", () => {
    expect(apantoDigest(null, null)).toEqual({
      job: "apanto-se-pelates",
      count: 0,
      oldest: null,
    });
  });
});

describe("egkrinoDigest", () => {
  it("should add both cards and name the client from the title", () => {
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
    const digest = egkrinoDigest(approvals, card(1, []));
    expect(digest.count).toBe(3);
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
