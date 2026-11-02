import { describe, expect, it } from "vitest";

import type { InboxItem, MentionItem, QueueItem } from "../view-schema";
import {
  j1ConversationsOf,
  j1MentionsOf,
  j1RequestsOf,
  tabLabelOf,
} from "./j1-adapter";

const NOW = new Date("2026-11-02T10:00:00Z");

const inboxItem = (overrides: Partial<InboxItem> = {}): InboxItem => ({
  clientId: "c-1",
  clientName: "Κυψέλη Καφέ",
  lastAt: "2026-11-01T09:30:00Z",
  preview: "Καλημέρα, στείλαμε το μενού",
  lastInternal: false,
  lastDeleted: false,
  unread: 2,
  partial: false,
  ...overrides,
});

const queueItem = (overrides: Partial<QueueItem> = {}): QueueItem => ({
  messageId: "m-1",
  deliverableId: null,
  clientId: "c-1",
  clientName: "Κυψέλη Καφέ",
  productionTitle: "Social Νοέμβριος",
  kind: "deliverable",
  state: "open",
  assigneeName: "Άννα",
  daysOpen: 3,
  stale: false,
  text: "Θέλουμε ένα reel για το νέο μενού",
  at: "2026-10-30T08:00:00Z",
  closed: null,
  ...overrides,
});

describe("j1ConversationsOf", () => {
  it("should count open requests per client when the open view loaded", () => {
    const [row] = j1ConversationsOf(
      [inboxItem()],
      [
        queueItem(),
        queueItem({ messageId: "m-2" }),
        queueItem({ clientId: "c-2" }),
      ],
      NOW,
    );
    expect(row).toMatchObject({
      id: "c-1",
      href: "/app/messages/c-1",
      preview: "Καλημέρα, στείλαμε το μενού",
      unread: 2,
      openRequests: 2,
    });
    expect(row?.when).toContain("01/11");
  });

  it("should leave the request count unknown when the open view failed", () => {
    expect(
      j1ConversationsOf([inboxItem()], null, NOW)[0]?.openRequests,
    ).toBeNull();
  });

  it("should mark internal and deleted previews like the current inbox", () => {
    const [internal, deleted] = j1ConversationsOf(
      [inboxItem({ lastInternal: true }), inboxItem({ lastDeleted: true })],
      [],
      NOW,
    );
    expect(internal?.preview).toBe("Εσωτερικό: Καλημέρα, στείλαμε το μενού");
    expect(deleted?.preview).toBe("Το Μήνυμα διαγράφηκε");
  });
});

describe("j1MentionsOf", () => {
  it("should link to the message anchor inside the conversation", () => {
    const mention: MentionItem = {
      messageId: "m-9",
      clientId: "c-1",
      clientName: "Κυψέλη Καφέ",
      at: "2026-11-01T09:30:00Z",
      body: "@Άννα δες το brief",
      authorName: "Νίκος",
    };
    expect(j1MentionsOf([mention], NOW)[0]).toMatchObject({
      href: "/app/messages/c-1#m-m-9",
      text: "Νίκος: @Άννα δες το brief",
    });
  });
});

describe("j1RequestsOf", () => {
  it("should describe an open request with owner and days open", () => {
    expect(j1RequestsOf([queueItem()], NOW)[0]).toMatchObject({
      kind: "Νέο Παραδοτέο",
      state: "ανοιχτό",
      isOpen: true,
      owner: "Υπεύθυνος: Άννα · ανοιχτό 3 μέρες",
      href: "/app/messages/c-1#m-m-1",
      closing: null,
    });
  });

  it("should describe how a done request closed, with its result link", () => {
    const [row] = j1RequestsOf(
      [
        queueItem({
          state: "done",
          closed: {
            at: "2026-11-01T12:00:00Z",
            byName: "Άννα",
            link: null,
            comment: "Έγινε",
            reply: null,
            automatic: true,
            resultKind: "deliverable",
            resultId: "d-1",
          },
        }),
      ],
      NOW,
    );
    expect(row?.isOpen).toBe(false);
    expect(row?.owner).toBe("Υπεύθυνος: Άννα");
    expect(row?.closing).toMatchObject({
      isDone: true,
      isAutomatic: true,
      result: { href: "/app/deliverables/d-1" },
      comment: "Έγινε",
    });
    expect(row?.closing?.line).toMatch(/^ολοκληρώθηκε · Άννα · 01\/11/);
  });

  it("should open a change request on its deliverable", () => {
    expect(
      j1RequestsOf(
        [queueItem({ kind: "change", messageId: null, deliverableId: "d-7" })],
        NOW,
      )[0]?.href,
    ).toBe("/app/deliverables/d-7");
  });
});

describe("tabLabelOf", () => {
  it("should add the count only when it loaded", () => {
    expect(tabLabelOf("Αιτήματα", 4)).toBe("Αιτήματα (4)");
    expect(tabLabelOf("Αιτήματα", null)).toBe("Αιτήματα");
  });
});
