import { describe, expect, it } from "vitest";

import {
  allowedView,
  clientChatHref,
  clientDeliverableHref,
  openCountOf,
  parseRequestView,
  queueItemHref,
  requestsHref,
  resultLink,
  sortClientRequests,
  visibleViews,
} from "./request-helpers";
import type { ClientRequest, QueueItem } from "./view-schema";

const CLIENT = "c1c1c1c1-0000-4000-8000-000000000001";
const MESSAGE = "a1a1a1a1-0000-4000-8000-000000000001";
const DELIVERABLE = "d1d1d1d1-0000-4000-8000-000000000001";

const queueItem = (patch: Partial<QueueItem> = {}): QueueItem => ({
  messageId: MESSAGE,
  deliverableId: null,
  clientId: CLIENT,
  clientName: "Πελάτης",
  productionTitle: null,
  kind: "other",
  state: "open",
  assigneeName: null,
  daysOpen: 0,
  stale: false,
  text: "x",
  at: "2026-10-12T10:00:00Z",
  closed: null,
  ...patch,
});

const clientRequest = (patch: Partial<ClientRequest> = {}): ClientRequest => ({
  messageId: MESSAGE,
  deliverableId: null,
  deliverableTitle: null,
  kind: "other",
  state: "open",
  at: "2026-10-12T10:00:00Z",
  text: "x",
  link: null,
  comment: null,
  reply: null,
  automatic: false,
  resultKind: null,
  resultId: null,
  decision: null,
  ...patch,
});

describe("parseRequestView", () => {
  it("should default to the requests assigned to me", () => {
    expect(parseRequestView(undefined)).toBe("mine");
    expect(parseRequestView("bogus")).toBe("mine");
  });
  it("should keep a known view", () => {
    expect(parseRequestView("closed")).toBe("closed");
  });
});

describe("visibleViews", () => {
  it("should hide the unassigned view from someone who cannot reassign", () => {
    expect(visibleViews({ canReassign: false, solo: false })).toEqual([
      "mine",
      "open",
      "closed",
    ]);
  });
  it("should hide the unassigned view when there is a single active member", () => {
    expect(visibleViews({ canReassign: true, solo: true })).not.toContain(
      "unassigned",
    );
  });
  it("should show all four views to someone who reassigns in a team", () => {
    expect(visibleViews({ canReassign: true, solo: false })).toEqual([
      "mine",
      "open",
      "unassigned",
      "closed",
    ]);
  });
});

describe("allowedView", () => {
  it("should fall back to mine for an unassigned link without the permission", () => {
    expect(allowedView("unassigned", false)).toBe("mine");
    expect(allowedView("unassigned", true)).toBe("unassigned");
    expect(allowedView("closed", false)).toBe("closed");
  });
});

describe("requestsHref", () => {
  it("should keep the default view out of the address", () => {
    expect(requestsHref("mine")).toBe("/app/messages?tab=requests");
    expect(requestsHref("open")).toBe("/app/messages?tab=requests&view=open");
  });
});

describe("queueItemHref", () => {
  it("should open the conversation anchored at the message", () => {
    expect(queueItemHref(queueItem())).toBe(
      `/app/messages/${CLIENT}#m-${MESSAGE}`,
    );
  });
  it("should open the deliverable for a change after approval", () => {
    expect(
      queueItemHref(
        queueItem({
          kind: "change",
          messageId: null,
          deliverableId: DELIVERABLE,
        }),
      ),
    ).toBe(`/app/deliverables/${DELIVERABLE}`);
  });
});

describe("resultLink", () => {
  it("should map a result to its page", () => {
    expect(resultLink("deliverable", DELIVERABLE)?.href).toBe(
      `/app/deliverables/${DELIVERABLE}`,
    );
    expect(resultLink("filming", MESSAGE)?.href).toBe(
      `/app/filming/${MESSAGE}`,
    );
  });
  it("should give nothing when there is no result", () => {
    expect(resultLink(null, null)).toBeNull();
  });
  it("should not link a client to a filming page", () => {
    expect(resultLink("filming", MESSAGE, false)).toBeNull();
    expect(resultLink("deliverable", DELIVERABLE, false)?.href).toBe(
      `/app/deliverables/${DELIVERABLE}`,
    );
  });
});

describe("client links", () => {
  it("should send a change request to the deliverable", () => {
    const item = clientRequest({
      kind: "change",
      messageId: null,
      deliverableId: DELIVERABLE,
    });
    expect(clientDeliverableHref(item)).toBe(
      `/app/deliverables/${DELIVERABLE}`,
    );
    expect(clientChatHref(item)).toBeNull();
  });
  it("should send a request that became a deliverable to that deliverable", () => {
    const item = clientRequest({
      state: "done",
      resultKind: "deliverable",
      resultId: DELIVERABLE,
    });
    expect(clientDeliverableHref(item)).toBe(
      `/app/deliverables/${DELIVERABLE}`,
    );
  });
  it("should not link a filming result as a deliverable", () => {
    expect(
      clientDeliverableHref(
        clientRequest({ resultKind: "filming", resultId: MESSAGE }),
      ),
    ).toBeNull();
  });
  it("should link a message request back to the conversation", () => {
    expect(clientChatHref(clientRequest())).toBe(`/app/messages#m-${MESSAGE}`);
  });
});

describe("sortClientRequests", () => {
  it("should put open requests first and newest first inside each group", () => {
    const sorted = sortClientRequests([
      clientRequest({ messageId: "old-open", at: "2026-10-01T10:00:00Z" }),
      clientRequest({
        messageId: "new-done",
        state: "done",
        at: "2026-10-12T10:00:00Z",
      }),
      clientRequest({ messageId: "new-open", at: "2026-10-10T10:00:00Z" }),
      clientRequest({
        messageId: "old-rejected",
        state: "rejected",
        at: "2026-10-02T10:00:00Z",
      }),
    ]);
    expect(sorted.map((item) => item.messageId)).toEqual([
      "new-open",
      "old-open",
      "new-done",
      "old-rejected",
    ]);
  });
  it("should not change the input", () => {
    const input = [clientRequest({ state: "done" }), clientRequest()];
    sortClientRequests(input);
    expect(input[0]?.state).toBe("done");
  });
});

describe("openCountOf", () => {
  it("should count only open requests", () => {
    expect(
      openCountOf([
        clientRequest(),
        clientRequest({ state: "done" }),
        clientRequest({ state: "rejected" }),
      ]),
    ).toBe(1);
  });
});
