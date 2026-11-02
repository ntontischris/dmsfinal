import { describe, expect, it } from "vitest";

import type {
  ConversationList,
  ConversationMessage,
} from "../assistant-view-schema";
import { fmtWhen, l2RowOf, l2Tabs, turnsOf, usageOf } from "./l2-adapter";

const message = (
  overrides: Partial<ConversationMessage>,
): ConversationMessage => ({
  id: "m",
  role: "user",
  content: "",
  noSource: false,
  createdAt: "2026-10-30T10:00:00Z",
  sources: [],
  ...overrides,
});

const list: ConversationList = {
  counts: { all: 3, public: 1, client: 1, team: 1 },
  page: 1,
  pageSize: 50,
  total: 3,
  items: [
    {
      id: "c-1",
      audience: "client",
      language: "el",
      startedAt: "2026-10-30T09:00:00Z",
      lastMessageAt: "2026-10-30T10:05:00Z",
      firstQuestion: "Πότε έρχεται το βίντεο;",
      messageCount: 4,
      questionCount: 2,
      noSourceCount: 1,
      who: "Μαρία",
      clientName: "Κυψέλη Καφέ",
    },
  ],
};

describe("L2 adapter", () => {
  it("should format times in Athens", () => {
    expect(fmtWhen("2026-10-30T10:05:00Z")).toBe("30/10/2026 12:05");
  });

  it("should build tabs with counts and the current one", () => {
    const tabs = l2Tabs(list, "client");
    expect(tabs.map((tab) => tab.label)).toEqual([
      "Όλες (3)",
      "Δημόσιες (1)",
      "Πελατών (1)",
      "Ομάδας (1)",
    ]);
    expect(tabs[2]).toMatchObject({
      href: "/app/knowledge/conversations?tab=client",
      isCurrent: true,
    });
  });

  it("should map a conversation row", () => {
    const [first] = list.items;
    expect(first && l2RowOf(first)).toEqual({
      id: "c-1",
      href: "/app/knowledge/conversations/c-1",
      who: "Μαρία (Κυψέλη Καφέ)",
      firstQuestion: "Πότε έρχεται το βίντεο;",
      when: "el · 30/10/2026 12:05",
      counts: "Ερωτήσεις 2 · Αναπάντητες 1",
      kind: "πελάτη",
    });
  });

  it("should pair questions with answers and keep sources", () => {
    const turns = turnsOf([
      message({ id: "q1", content: "Α;" }),
      message({
        id: "a1",
        role: "assistant",
        content: "Ναι.",
        sources: [
          { kind: "item", id: "i-1", title: "Οδηγός", gone: false },
          { kind: "package", id: "p-1", title: "Social", gone: true },
        ],
      }),
      message({ id: "q2", content: "Β;" }),
      message({ id: "q3", content: "Γ;" }),
      message({
        id: "a3",
        role: "assistant",
        content: "Δεν ξέρω.",
        noSource: true,
      }),
    ]);
    expect(turns.map((turn) => [turn.question, turn.answer])).toEqual([
      ["Α;", "Ναι."],
      ["Β;", null],
      ["Γ;", "Δεν ξέρω."],
    ]);
    expect(turns[0]?.sources).toEqual([
      {
        key: "item-i-1-0",
        label: "Γνώση: «Οδηγός»",
        isGone: false,
        href: "/app/knowledge/manage/i-1",
      },
      {
        key: "package-p-1-1",
        label: "Πακέτο: «Social» (δεν υπάρχει πια)",
        isGone: true,
        href: null,
      },
    ]);
    expect(turns[2]?.isUnanswered).toBe(true);
  });

  it("should start a turn for an answer without a question", () => {
    expect(
      turnsOf([message({ id: "a", role: "assistant", content: "Γεια" })]),
    ).toEqual([
      {
        key: "a",
        question: null,
        answer: "Γεια",
        sources: [],
        isUnanswered: false,
      },
    ]);
  });

  it("should describe usage against the cap and hide it when closed", () => {
    expect(
      usageOf({
        spentMicros: 12_000_000,
        capMicros: 30_000_000,
        publicShare: 30,
      }),
    ).toEqual({
      text: "$12 από $30 πλαφόν. Όριο δημόσιου μέρους: $9 (30% του πλαφόν).",
      spentPercent: 40,
      ceilingPercent: 30,
    });
    expect(
      usageOf({ spentMicros: 0, capMicros: 0, publicShare: 30 }),
    ).toBeNull();
  });
});
