import { describe, expect, it } from "vitest";

import {
  replyTagOf,
  sortedProductions,
  suggestedProductionOf,
} from "./reply-tag";

const PRODUCTIONS = [
  { id: "p-z", title: "Social Νοέμβριος" },
  { id: "p-a", title: "Αφίσα Χριστουγέννων" },
  { id: "p-b", title: "Βίντεο εγκαινίων" },
];

const message = (
  overrides: Partial<{
    authorKind: "team" | "client";
    productionId: string | null;
    request: { state: string } | null;
  }> = {},
) => ({
  authorKind: "client" as const,
  productionId: null,
  request: null,
  ...overrides,
});

describe("sortedProductions", () => {
  it("should sort productions alphabetically in Greek", () => {
    expect(sortedProductions(PRODUCTIONS).map((p) => p.id)).toEqual([
      "p-a",
      "p-b",
      "p-z",
    ]);
  });
});

describe("replyTagOf", () => {
  const thread = (messages: ReturnType<typeof message>[]) => ({
    messages,
    productions: PRODUCTIONS,
    canWriteUntagged: true,
  });

  it("should tag the reply with the client's last tagged message", () => {
    const messages = [
      message({ productionId: "p-a" }),
      message({ authorKind: "team", productionId: "p-b" }),
      message({ productionId: null }),
    ];
    expect(replyTagOf(thread(messages), undefined)).toBe("p-a");
  });

  it("should fall back to the request's production when the client never tagged", () => {
    const messages = [
      message({ authorKind: "team", productionId: "p-b", request: { state: "done" } }),
      message(),
    ];
    expect(replyTagOf(thread(messages), undefined)).toBe("p-b");
  });

  it("should keep the conversation filter when one is set", () => {
    const messages = [message({ productionId: "p-a" })];
    expect(replyTagOf(thread(messages), "p-b")).toBe("p-b");
  });

  it("should stay untagged when nothing is tagged and untagged is allowed", () => {
    expect(replyTagOf(thread([message()]), undefined)).toBe("");
  });

  it("should pick the first production alphabetically when untagged is not allowed", () => {
    expect(
      replyTagOf({ ...thread([message()]), canWriteUntagged: false }, undefined),
    ).toBe("p-a");
  });
});

describe("suggestedProductionOf", () => {
  it("should suggest the last tag, else the first production alphabetically", () => {
    expect(suggestedProductionOf([message({ productionId: "p-b" })], PRODUCTIONS)).toBe("p-b");
    expect(suggestedProductionOf([message()], PRODUCTIONS)).toBe("p-a");
    expect(suggestedProductionOf([message()], [])).toBeNull();
  });
});
