import { describe, expect, it } from "vitest";

import { chatTopicOf, refreshModeOf } from "./refresh-mode";

describe("refreshModeOf", () => {
  it("με ενεργό κανάλι η ανανέωση γίνεται μόνο με Realtime", () => {
    expect(refreshModeOf("SUBSCRIBED")).toBe("realtime");
  });

  it.each(["CHANNEL_ERROR", "TIMED_OUT", "CLOSED"])(
    "όταν το κανάλι %s, γυρίζει στην ανανέωση κάθε 20″",
    (status) => {
      expect(refreshModeOf(status)).toBe("poll");
    },
  );
});

describe("chatTopicOf", () => {
  it("ομάδα και πελάτης ακούν διαφορετικό θέμα του ίδιου Πελάτη", () => {
    const id = "00000000-0000-0000-0000-0000000000c1";
    expect(chatTopicOf("team", id)).toBe(`chat-team:${id}`);
    expect(chatTopicOf("client", id)).toBe(`chat-client:${id}`);
  });
});
