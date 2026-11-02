import { describe, expect, it } from "vitest";

import type { UnansweredList, UnansweredRow } from "../assistant-view-schema";
import {
  closedOf,
  closeHref,
  l3RowOf,
  l3Tabs,
  optionLabel,
  parseSelection,
} from "./l3-adapter";

const row = (overrides: Partial<UnansweredRow> = {}): UnansweredRow => ({
  id: "u-1",
  question: "Πόσο κοστίζει;",
  audience: "public",
  count: 3,
  firstAskedAt: "2026-10-01T10:00:00Z",
  lastAskedAt: "2026-10-30T10:00:00Z",
  status: "open",
  ignoreReason: null,
  closedAt: null,
  closedByName: null,
  coveredItem: null,
  conversationIds: ["c-1"],
  ...overrides,
});

describe("L3 adapter", () => {
  it("should parse the close selection and reject unknown reasons", () => {
    expect(parseSelection({ close: "u-1", reason: "abuse" })).toEqual({
      close: "u-1",
      by: null,
      reason: "abuse",
    });
    expect(parseSelection({ reason: "x" }).reason).toBeNull();
  });

  it("should build tabs with counts", () => {
    const list: UnansweredList = {
      counts: { open: 2, covered: 1, ignored: 0 },
      items: [],
    };
    expect(l3Tabs(list, "covered")).toEqual([
      {
        label: "Ανοιχτές (2)",
        href: "/app/knowledge/unanswered",
        isCurrent: false,
      },
      {
        label: "Καλύφθηκαν (1)",
        href: "/app/knowledge/unanswered?tab=covered",
        isCurrent: true,
      },
      {
        label: "Αγνοήθηκαν (0)",
        href: "/app/knowledge/unanswered?tab=ignored",
        isCurrent: false,
      },
    ]);
  });

  it("should keep only the chosen option in the close link", () => {
    expect(closeHref({ close: "u-1", by: "i-1" })).toBe(
      "/app/knowledge/unanswered?close=u-1&by=i-1",
    );
  });

  it("should map a row like the prototype", () => {
    expect(l3RowOf(row())).toEqual({
      id: "u-1",
      question: "Πόσο κοστίζει;",
      kind: "δημόσια",
      asked: "ρωτήθηκε 3 φορές",
      span: "01/10/2026 έως 30/10/2026",
      isOpen: true,
      isPublicQuestion: true,
      conversationIds: ["c-1"],
    });
  });

  it("should describe how a question was closed", () => {
    const covered = row({
      status: "covered",
      coveredItem: { id: "i-1", title: "Τιμές", status: "published" },
      closedAt: "2026-10-31T10:00:00Z",
      closedByName: "Άννα",
    });
    expect(closedOf(covered)).toEqual({
      covered: { id: "i-1", title: "Τιμές", status: "published" },
      isCoveredGone: false,
      ignored: null,
      when: "31/10/2026 · Άννα",
    });
    expect(closedOf(row({ status: "covered" })).isCoveredGone).toBe(true);
    expect(
      closedOf(row({ status: "ignored", ignoreReason: "off_topic" })).ignored,
    ).toBe("εκτός θέματος");
  });

  it("should warn when a public question gets a non-public item", () => {
    expect(
      optionLabel({ id: "i", title: "Τιμές", isPublic: false }, true),
    ).toBe("Τιμές (όχι δημόσιο)");
    expect(
      optionLabel({ id: "i", title: "Τιμές", isPublic: false }, false),
    ).toBe("Τιμές");
  });
});
