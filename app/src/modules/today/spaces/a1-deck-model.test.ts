import { describe, expect, it } from "vitest";

import type { CardRow } from "./a1-model";
import type { ListGroup } from "./a1-list";
import {
  breakdownOf,
  facesOf,
  initialsOf,
  isUrgentGroup,
  lineTagOf,
  moreLabelOf,
  selectedGroupOf,
  thumbOf,
} from "./a1-deck-model";

// Τρίτη 24/11/2026, ώρα Ελλάδας (UTC+2).
const TODAY = "2026-11-24";

const rowOf = (label: string, extra: Partial<CardRow> = {}): CardRow => ({
  label,
  href: `/r/${label}`,
  ...extra,
});

const groupOf = (
  id: ListGroup["id"],
  rows: readonly CardRow[],
  cardId = "to_invoice",
): ListGroup => ({
  id,
  title: id,
  lines: rows.map((row) => ({ cardId, row, laterKey: null })),
  more: [],
  failed: [],
});

describe("initialsOf", () => {
  it("παίρνει τον Πελάτη πριν από την παύλα, δύο γράμματα", () => {
    expect(initialsOf("Φούρνος Παπαδόπουλου — Reels Νοεμβρίου")).toBe("ΦΠ");
  });

  it("σταματά στη μέση τελεία και αγνοεί σύμβολα", () => {
    expect(initialsOf("Φωτογραφίες · νέα προϊόντα")).toBe("Φ");
    expect(initialsOf("Reel • προϊόν της εβδομάδας")).toBe("R");
  });

  it("μία λέξη δίνει ένα γράμμα, κενή ετικέτα τίποτα", () => {
    expect(initialsOf("ανάθεση")).toBe("Α");
    expect(initialsOf("  ")).toBe("");
  });
});

describe("lineTagOf", () => {
  it("η αναμονή γίνεται «σήμερα» ή μέρες", () => {
    expect(lineTagOf(rowOf("a", { waitingSince: "2026-11-24T08:00:00+00:00" }), TODAY)).toBe("σήμερα");
    expect(lineTagOf(rowOf("a", { waitingSince: "2026-11-21T08:00:00+00:00" }), TODAY)).toBe("3 ημέρες");
  });

  it("η ώρα της γραμμής γίνεται σήμερα/αύριο με ώρα, αλλιώς ημερομηνία", () => {
    expect(lineTagOf(rowOf("a", { at: "2026-11-24T08:00:00+00:00" }), TODAY)).toBe("σήμερα 10:00");
    expect(lineTagOf(rowOf("a", { at: "2026-11-25T15:30:00+00:00" }), TODAY)).toBe("αύριο 17:30");
    expect(lineTagOf(rowOf("a", { at: "2026-12-02T08:00:00+00:00" }), TODAY)).toBe("2/12");
  });

  it("χωρίς ώρα, καμία ετικέτα", () => {
    expect(lineTagOf(rowOf("a"), TODAY)).toBeNull();
    expect(lineTagOf(rowOf("a", { at: "όχι" }), TODAY)).toBeNull();
  });
});

describe("facesOf", () => {
  it("έως τρία διαφορετικά αρχικά, με τη σειρά των γραμμών", () => {
    const group = groupOf("client", [
      rowOf("Άλφα Βήτα — x"),
      rowOf("Άλφα Βήτα — y"),
      rowOf("Γάμα — z"),
      rowOf("Δέλτα Έψιλον — w"),
      rowOf("Ζήτα — v"),
    ]);
    expect(facesOf(group)).toEqual(["ΆΒ", "Γ", "ΔΈ"]);
  });
});

describe("thumbOf", () => {
  it("τα αρχικά του Πελάτη από την ετικέτα ή από τη δεύτερη γραμμή, ανάλογα με την κάρτα", () => {
    const line = (cardId: string, row: CardRow) => ({ cardId, row, laterKey: null });
    expect(thumbOf(line("overdue_invoices", rowOf("Κτήμα Ελιά, DEMO-015")))).toEqual({ text: "ΚΕ", isIcon: false });
    expect(thumbOf(line("unread_messages", rowOf("Μελίσσι Αρτοποιείο")))).toEqual({ text: "ΜΑ", isIcon: false });
    expect(
      thumbOf(line("versions_to_review", rowOf("Φωτογραφίες · νέα προϊόντα", { note: "Κοσμηματοπωλείο Αστέρι · Έκδοση 1" }))),
    ).toEqual({ text: "ΚΑ", isIcon: false });
  });

  it("χωρίς Πελάτη, το σύμβολο της ομάδας", () => {
    expect(thumbOf({ cardId: "health", row: rowOf("Κάτι δεν λειτουργεί"), laterKey: null })).toEqual({ text: "⚙", isIcon: true });
    expect(thumbOf({ cardId: "my_tasks", row: rowOf("Μοντάζ"), laterKey: null })).toEqual({ text: "✓", isIcon: true });
  });
});

describe("lineTagOf — προθεσμία", () => {
  it("μια περασμένη προθεσμία γίνεται «N ημέρες πίσω»", () => {
    expect(lineTagOf(rowOf("a", { note: "Αστέρι · Έκδοση 1 · προθεσμία 17 Οκτ" }), TODAY)).toBe("38 ημέρες πίσω");
    expect(lineTagOf(rowOf("a", { note: "Αστέρι · προθεσμία 23 Νοε" }), TODAY)).toBe("1 ημέρα πίσω");
  });

  it("μια προθεσμία που δεν πέρασε δεν δίνει ετικέτα πίσω", () => {
    expect(lineTagOf(rowOf("a", { note: "προθεσμία 30 Νοε" }), TODAY)).toBeNull();
  });
});

describe("breakdownOf", () => {
  it("τι μετράει η κάρτα: έως δύο είδη με όνομα και τα υπόλοιπα «άλλα»", () => {
    const group: ListGroup = {
      id: "money",
      title: "Χρήματα",
      lines: [
        { cardId: "to_invoice", row: rowOf("a"), laterKey: null },
        { cardId: "overdue_invoices", row: rowOf("b"), laterKey: null },
        { cardId: "cost_hours", row: rowOf("c"), laterKey: null },
      ],
      more: [{ cardId: "overdue_invoices", count: 4, href: "/x" }],
      failed: [],
    };
    expect(breakdownOf(group)).toBe("5 ληξιπρόθεσμα · 1 προς τιμολόγηση · 1 άλλο");
  });
});

describe("moreLabelOf", () => {
  it("λέει τι είναι τα υπόλοιπα", () => {
    expect(moreLabelOf({ cardId: "my_tasks", count: 5, href: "/x" })).toBe("Και 5 ακόμα εργασίες →");
  });
});

describe("isUrgentGroup", () => {
  it("επείγον μόνο ό,τι μετράει και η πρόταση: αποφάσεις και ληξιπρόθεσμα", () => {
    const decisions = new Set(["proposal_approvals"]);
    expect(isUrgentGroup(groupOf("mine", [rowOf("a", { isUrgent: true })], "my_tasks"), decisions)).toBe(false);
    expect(isUrgentGroup(groupOf("client", [rowOf("a")], "proposal_approvals"), decisions)).toBe(true);
    expect(isUrgentGroup(groupOf("money", [rowOf("a")], "overdue_invoices"), decisions)).toBe(true);
  });
});

describe("selectedGroupOf", () => {
  const time = groupOf("time", [rowOf("a")], "week_filming");
  const money = groupOf("money", [rowOf("b")], "overdue_invoices");
  const keep = groupOf("keep", [rowOf("c")], "next_steps_due");

  it("κρατά την ομάδα που ζητήθηκε, αν φαίνεται", () => {
    expect(selectedGroupOf([time, money, keep], "keep", new Set())?.id).toBe("keep");
  });

  it("αλλιώς την πρώτη με επείγον, αλλιώς την πρώτη", () => {
    expect(selectedGroupOf([time, money, keep], "company", new Set())?.id).toBe("money");
    expect(selectedGroupOf([time, keep], undefined, new Set())?.id).toBe("time");
    expect(selectedGroupOf([], undefined, new Set())).toBeNull();
  });
});
