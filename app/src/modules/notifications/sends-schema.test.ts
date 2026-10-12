import { describe, expect, it } from "vitest";

import {
  clientSendsPageSchema,
  retrySchema,
  sendsPageSchema,
} from "./sends-schema";

const ROW = {
  id: "a1",
  at: "2026-02-01T10:00:00+00:00",
  source: "automation",
  eventType: "deliverable.version_sent",
  eventLabel: "Νέα Έκδοση προς έγκριση",
  kind: null,
  channel: "email",
  recipientName: "Κώστας",
  state: "failed",
  recipientEmail: "b1@example.com",
  recipientCount: null,
  clientId: "00000000-0000-4000-8000-000000000001",
  clientName: "Πελάτης Ένα",
  attempts: 5,
  reason: "Ο πάροχος απέρριψε τη διεύθυνση",
  retryRef: "00000000-0000-4000-8000-000000000002",
  isRetried: false,
};

describe("sendsPageSchema", () => {
  it("should accept the sends_list answer", () => {
    const page = { items: [ROW], hasMore: false, failed: 1, clients: [] };
    expect(sendsPageSchema.safeParse(page).success).toBe(true);
  });

  it("should reject an unknown state", () => {
    const page = {
      items: [{ ...ROW, state: "bounced" }],
      hasMore: false,
      failed: 1,
      clients: [],
    };
    expect(sendsPageSchema.safeParse(page).success).toBe(false);
  });

  it("should drop any content key the database might add", () => {
    const page = {
      items: [{ ...ROW, subject: "Μυστικό" }],
      hasMore: false,
      failed: 1,
      clients: [],
    };
    const parsed = sendsPageSchema.parse(page);
    expect(parsed.items[0]).not.toHaveProperty("subject");
  });
});

describe("clientSendsPageSchema", () => {
  it("should accept the reduced client_sends rows", () => {
    const {
      id,
      at,
      source,
      eventType,
      eventLabel,
      kind,
      channel,
      recipientName,
      state,
    } = ROW;
    const page = {
      items: [
        {
          id,
          at,
          source,
          eventType,
          eventLabel,
          kind,
          channel,
          recipientName,
          state,
        },
      ],
      hasMore: true,
    };
    expect(clientSendsPageSchema.safeParse(page).success).toBe(true);
  });
});

describe("retrySchema", () => {
  it("should accept only a uuid", () => {
    expect(retrySchema.safeParse({ ref: ROW.retryRef }).success).toBe(true);
    expect(retrySchema.safeParse({ ref: "a1" }).success).toBe(false);
  });
});
