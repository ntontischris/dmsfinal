import { describe, expect, it } from "vitest";

import {
  DELETED_PREVIEW,
  filterMessages,
  formatWhen,
  isNewMessage,
  newestAt,
  parseFilter,
  parseProduction,
  parseTab,
  previewLine,
  productionChips,
  threadHref,
  truncate,
  unreadTotal,
} from "./helpers";
import type { InboxItem, ThreadMessage } from "./view-schema";

const item = (patch: Partial<InboxItem> = {}): InboxItem => ({
  clientId: "c1",
  clientName: "Πελάτης Α",
  lastAt: "2026-10-12T08:00:00Z",
  preview: "Καλημέρα",
  lastInternal: false,
  lastDeleted: false,
  unread: 0,
  partial: false,
  ...patch,
});

const message = (patch: Partial<ThreadMessage> = {}): ThreadMessage => ({
  id: "m1",
  at: "2026-10-12T08:00:00Z",
  authorId: "u1",
  authorName: "Άννα",
  authorKind: "team",
  mine: false,
  body: "Γεια",
  productionId: null,
  productionTitle: null,
  internal: false,
  mentions: [],
  editedAt: null,
  deleted: false,
  canEdit: false,
  canDelete: false,
  ...patch,
});

describe("truncate", () => {
  it("αφήνει ανέγγιχτο το κείμενο μέσα στο όριο", () => {
    expect(truncate("abc", 3)).toBe("abc");
  });
  it("κόβει και προσθέτει αποσιωπητικά", () => {
    expect(truncate("abcdef", 3)).toBe("abc…");
  });
});

describe("previewLine", () => {
  it("δείχνει το κείμενο", () => {
    expect(previewLine(item())).toBe("Καλημέρα");
  });
  it("προσθέτει πρόθεμα στα Εσωτερικά", () => {
    expect(previewLine(item({ lastInternal: true }))).toBe(
      "Εσωτερικό: Καλημέρα",
    );
  });
  it("δείχνει σταθερό κείμενο για διαγραμμένο", () => {
    expect(previewLine(item({ lastDeleted: true, preview: null }))).toBe(
      DELETED_PREVIEW,
    );
  });
  it("προσθέτει αποσιωπητικά όταν γέμισε το όριο των 90", () => {
    const full = "α".repeat(90);
    expect(previewLine(item({ preview: full }))).toBe(`${full}…`);
  });
});

describe("unreadTotal", () => {
  it("αθροίζει τα αδιάβαστα όλων των Συνομιλιών", () => {
    expect(unreadTotal([item({ unread: 2 }), item({ unread: 3 })])).toBe(5);
  });
});

describe("formatWhen", () => {
  const now = new Date("2026-10-12T12:00:00Z");
  it("γράφει μέρα και ώρα Αθήνας χωρίς έτος φέτος", () => {
    expect(formatWhen("2026-09-20T08:50:00Z", now)).toBe("20/09 11:50");
  });
  it("προσθέτει έτος όταν δεν είναι φέτος", () => {
    expect(formatWhen("2025-12-31T10:00:00Z", now)).toBe("31/12/2025 12:00");
  });
});

describe("newestAt", () => {
  it("δίνει το νεότερο Μήνυμα όποια κι αν είναι η σειρά", () => {
    expect(
      newestAt([
        message({ at: "2026-10-12T08:00:00Z" }),
        message({ at: "2026-10-12T10:00:00Z" }),
        message({ at: "2026-10-12T09:00:00Z" }),
      ]),
    ).toBe("2026-10-12T10:00:00Z");
  });
});

describe("isNewMessage", () => {
  const readAt = "2026-10-12T08:00:00Z";
  it("είναι νέο αν έφτασε μετά τον δείκτη", () => {
    expect(isNewMessage(message({ at: "2026-10-12T09:00:00Z" }), readAt)).toBe(
      true,
    );
  });
  it("δεν είναι νέο αν είναι παλαιότερο από τον δείκτη", () => {
    expect(isNewMessage(message({ at: "2026-10-12T07:00:00Z" }), readAt)).toBe(
      false,
    );
  });
  it("χωρίς δείκτη όλα των άλλων είναι νέα", () => {
    expect(isNewMessage(message(), null)).toBe(true);
  });
  it("τα δικά μου και τα διαγραμμένα δεν είναι νέα", () => {
    expect(isNewMessage(message({ mine: true }), null)).toBe(false);
    expect(isNewMessage(message({ deleted: true }), null)).toBe(false);
  });
});

describe("filterMessages", () => {
  const all = [
    message({ id: "a" }),
    message({ id: "b", productionId: "p1", productionTitle: "Reel" }),
    message({ id: "c", internal: true }),
  ];
  const ids = (list: ThreadMessage[]): string[] =>
    list.map((entry) => entry.id);
  it("όλα", () => {
    expect(ids(filterMessages(all, { filter: "all" }))).toEqual([
      "a",
      "b",
      "c",
    ]);
  });
  it("χωρίς ετικέτα", () => {
    expect(ids(filterMessages(all, { filter: "untagged" }))).toEqual([
      "a",
      "c",
    ]);
  });
  it("εσωτερικά", () => {
    expect(ids(filterMessages(all, { filter: "internal" }))).toEqual(["c"]);
  });
  it("η Παραγωγή υπερισχύει του φίλτρου", () => {
    expect(
      ids(filterMessages(all, { filter: "internal", production: "p1" })),
    ).toEqual(["b"]);
  });
});

describe("productionChips", () => {
  it("δίνει μία ετικέτα ανά Παραγωγή με ορατά Μηνύματα", () => {
    const chips = productionChips([
      message({ productionId: "p1", productionTitle: "Reel" }),
      message({ productionId: "p1", productionTitle: "Reel" }),
      message({ productionId: null }),
    ]);
    expect(chips).toEqual([{ id: "p1", title: "Reel" }]);
  });
});

describe("parsers", () => {
  it("parseTab γυρίζει στις Συνομιλίες", () => {
    expect(parseTab("mentions")).toBe("mentions");
    expect(parseTab("x")).toBe("conversations");
  });
  it("parseFilter γυρίζει στο all", () => {
    expect(parseFilter("internal")).toBe("internal");
    expect(parseFilter("x")).toBe("all");
  });
  it("parseProduction δέχεται μόνο uuid", () => {
    expect(parseProduction("nope")).toBeUndefined();
    expect(parseProduction("00000000-0000-0000-0000-0000000000f1")).toBe(
      "00000000-0000-0000-0000-0000000000f1",
    );
  });
});

describe("threadHref", () => {
  it("χωρίς παραμέτρους", () => {
    expect(threadHref("c1")).toBe("/app/messages/c1");
  });
  it("με Παραγωγή και φίλτρο", () => {
    expect(threadHref("c1", { production: "p1" })).toBe(
      "/app/messages/c1?production=p1",
    );
    expect(threadHref("c1", { filter: "internal" })).toBe(
      "/app/messages/c1?filter=internal",
    );
  });
});
