import { describe, expect, it } from "vitest";

import type { Viewer } from "@/modules/access";

import {
  canSeeClientSends,
  formatWhen,
  parseSendsChannel,
  parseSendsClient,
  parseSendsCursor,
  parseSendsTab,
  sendsCaps,
  sendsHref,
  whatOf,
} from "./sends-helpers";
import type { ClientSend } from "./sends-schema";

const UUID = "00000000-0000-4000-8000-000000000001";

const teamViewer = (
  permissions: Record<string, "all" | "mine">,
  userId = UUID,
): Viewer => ({
  status: "signed-in",
  userId,
  email: "owner@example.com",
  team: { name: "Γιώργος", isOwner: false, permissions },
});

const send = (overrides: Partial<ClientSend> = {}): ClientSend => ({
  id: "a1",
  at: "2026-02-01T10:00:00+00:00",
  source: "automation",
  eventType: "message.created",
  eventLabel: "Νέο Μήνυμα",
  kind: null,
  channel: "notification",
  recipientName: "Κώστας",
  state: "sent",
  ...overrides,
});

describe("parse* του K3", () => {
  it("should default to the sent tab and accept only known tabs", () => {
    expect(parseSendsTab(undefined)).toBe("sent");
    expect(parseSendsTab("failed")).toBe("failed");
    expect(parseSendsTab("scheduled")).toBe("scheduled");
    expect(parseSendsTab("other")).toBe("sent");
  });

  it("should accept only the two channels", () => {
    expect(parseSendsChannel("email")).toBe("email");
    expect(parseSendsChannel("sms")).toBeNull();
  });

  it("should accept only a uuid as client", () => {
    expect(parseSendsClient(UUID)).toBe(UUID);
    expect(parseSendsClient("drop table")).toBeNull();
  });

  it("should accept a cursor only with an ISO time and a database id", () => {
    expect(parseSendsCursor("2026-02-01T10:00:00+00:00", "a12")).toEqual({
      at: "2026-02-01T10:00:00+00:00",
      id: "a12",
    });
    expect(
      parseSendsCursor("2026-02-01T10:00:00+00:00", `o${UUID}`),
    ).not.toBeNull();
    expect(parseSendsCursor("yesterday", "a12")).toBeNull();
    expect(parseSendsCursor("2026-02-01T10:00:00+00:00", "x;--")).toBeNull();
  });
});

describe("sendsHref", () => {
  it("should keep the defaults out of the address", () => {
    expect(
      sendsHref({ tab: "sent", channel: null, client: null, cursor: null }),
    ).toBe("/app/settings/sends");
  });

  it("should carry tab, filters and cursor", () => {
    expect(
      sendsHref({
        tab: "failed",
        channel: "email",
        client: UUID,
        cursor: { at: "2026-02-01T10:00:00Z", id: "a3" },
      }),
    ).toBe(
      `/app/settings/sends?tab=failed&channel=email&client=${UUID}&before=2026-02-01T10%3A00%3A00Z&beforeId=a3`,
    );
  });
});

describe("whatOf", () => {
  it("should prefer the event label, then the system kind label", () => {
    expect(whatOf(send())).toBe("Νέο Μήνυμα");
    expect(
      whatOf(
        send({
          eventLabel: null,
          eventType: null,
          kind: "magiclink",
          source: "system",
        }),
      ),
    ).toBe("Σύνδεσμος εισόδου");
    expect(
      whatOf(send({ eventLabel: null, eventType: null, kind: "unknown_kind" })),
    ).toBe("unknown_kind");
  });
});

describe("formatWhen", () => {
  it("should show Athens time", () => {
    expect(formatWhen("2026-02-01T10:00:00Z")).toContain("12:00");
    expect(formatWhen("not a date")).toBe("");
  });
});

describe("Δικαιώματα του Ιστορικού", () => {
  it("should let automations.manage and health.view view and retry", () => {
    expect(sendsCaps(teamViewer({ "automations.manage": "all" }))).toEqual({
      canView: true,
      canRetry: true,
    });
    expect(sendsCaps(teamViewer({ "health.view": "all" }))).toEqual({
      canView: true,
      canRetry: true,
    });
    expect(sendsCaps(teamViewer({ "clients.view": "mine" }))).toEqual({
      canView: false,
      canRetry: false,
    });
  });

  it("should show the client tab to the client's manager without the permission", () => {
    const seller = teamViewer({ "clients.view": "mine" });
    expect(canSeeClientSends(seller, UUID)).toBe(true);
    expect(
      canSeeClientSends(seller, "00000000-0000-4000-8000-000000000002"),
    ).toBe(false);
    expect(canSeeClientSends(seller, null)).toBe(false);
  });

  it("should never show the client tab to a client user", () => {
    const client: Viewer = {
      status: "signed-in",
      userId: UUID,
      email: "b1@example.com",
      team: null,
      clientGrants: { "c.chatRead": "all" },
    };
    expect(canSeeClientSends(client, UUID)).toBe(false);
  });
});
