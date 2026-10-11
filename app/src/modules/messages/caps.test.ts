import { describe, expect, it } from "vitest";

import type { Viewer } from "@/modules/access";

import { messagesViewOf } from "./caps";

const USER = "44444444-4444-4444-8444-444444444444";

const teamViewer = (permissions: Record<string, "all" | "mine">): Viewer => ({
  status: "signed-in",
  userId: USER,
  email: "team@example.com",
  team: { name: "Άννα", isOwner: false, permissions },
});

const clientViewer = (
  clientGrants: Record<string, "all" | "mine">,
): Viewer => ({
  status: "signed-in",
  userId: USER,
  email: "client@example.com",
  team: null,
  clientGrants,
});

describe("messagesViewOf", () => {
  it("should give the inbox to a team member who chats with clients", () => {
    expect(messagesViewOf(teamViewer({ "messages.chat": "all" }))).toBe("team");
  });

  it("should give nothing to a team member without the chat permission", () => {
    expect(messagesViewOf(teamViewer({ "finance.view": "all" }))).toBe("none");
  });

  it("should give the client view to a client user who can read the conversation", () => {
    expect(messagesViewOf(clientViewer({ "c.chatRead": "all" }))).toBe(
      "client",
    );
  });

  it("should give the client view to a client user who can also write", () => {
    expect(
      messagesViewOf(
        clientViewer({ "c.chatRead": "all", "c.chatWrite": "all" }),
      ),
    ).toBe("client");
  });

  it("should give nothing to a client user who only has other permissions", () => {
    expect(messagesViewOf(clientViewer({ "c.finance": "all" }))).toBe("none");
  });

  it("should give nothing to a client user who can write but not read", () => {
    expect(messagesViewOf(clientViewer({ "c.chatWrite": "all" }))).toBe("none");
  });

  it("should give nothing to an anonymous visitor", () => {
    expect(messagesViewOf({ status: "anonymous" })).toBe("none");
  });
});
