import { describe, expect, it } from "vitest";

import type { ClientSend } from "../sends-schema";
import { sendsSummary } from "./b2-sends-model";

const send = (overrides: Partial<ClientSend> = {}): ClientSend => ({
  id: "s-1",
  at: "2026-11-02T09:00:00Z",
  source: "automation",
  eventType: null,
  eventLabel: "Νέο Τιμολόγιο",
  kind: null,
  channel: "email",
  recipientName: "Μαρία",
  state: "sent",
  ...overrides,
});

describe("sendsSummary", () => {
  it("should count a single send", () => {
    expect(sendsSummary([send()], false)).toBe("1 αποστολή προς τον Πελάτη.");
  });

  it("should mention failed sends", () => {
    const sends = [send(), send({ id: "s-2", state: "failed" })];
    expect(sendsSummary(sends, false)).toBe(
      "2 αποστολές προς τον Πελάτη, 1 απέτυχαν.",
    );
  });

  it("should say these are the latest when more exist", () => {
    const sends = [send(), send({ id: "s-2" })];
    expect(sendsSummary(sends, true)).toBe(
      "Τελευταίες 2 αποστολές προς τον Πελάτη.",
    );
  });
});
