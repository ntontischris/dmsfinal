import { describe, expect, it } from "vitest";

import { briefOf } from "./a1-brief";
import type { CardContent, CardDef, CardKind } from "./a1-model";

const GROUPS: Readonly<Record<string, string>> = {
  health: "health",
  readiness: "health",
  proposal_approvals: "decide",
  google_deletions: "decide",
  requests_mentions: "work",
  my_deliverables: "work",
  overdue_invoices: "money",
  week_filming: "week",
  unanswered: "knowledge",
};

const builtOf = (
  id: string,
  count: number,
  kind: CardKind = "action",
): { card: CardDef; content: CardContent } => ({
  card: { id, title: `Τίτλος ${id}`, source: "A1", kind },
  content: {
    count,
    rows: Array.from({ length: Math.min(count, 3) }, (_, n) => ({
      label: `${id}-${n}`,
      href: `/app/${id}/${n}`,
    })),
    allHref: `/app/${id}`,
    emptyText: "",
  },
});

const brief = (
  built: ReturnType<typeof builtOf>[],
  failed: readonly string[] = [],
) =>
  briefOf({
    built,
    failed: new Set(failed),
    groupOf: (code) => GROUPS[code],
  });

describe("briefOf", () => {
  it("οι κάρτες απόφασης και τα Αιτήματα πελατών πάνε στο «Μόνο εσύ μπορείς»· το Google όχι", () => {
    const result = brief([
      builtOf("proposal_approvals", 2),
      builtOf("requests_mentions", 1),
      builtOf("google_deletions", 1),
    ]);
    expect(result.decisions.map(({ card }) => card.id)).toEqual([
      "proposal_approvals",
      "requests_mentions",
    ]);
    expect(result.hasDecisions).toBe(true);
    expect(result.others.map((other) => other.id)).toEqual([
      "google_deletions",
    ]);
  });

  it("τα Γυρίσματα της εβδομάδας πάνε στο πρόγραμμα, τα ληξιπρόθεσμα στα Χρήματα", () => {
    const result = brief([
      builtOf("week_filming", 0, "info"),
      builtOf("overdue_invoices", 4),
    ]);
    expect(result.week?.card.id).toBe("week_filming");
    expect(result.money?.card.id).toBe("overdue_invoices");
    expect(result.overdue).toBe(4);
    expect(result.others).toEqual([]);
  });

  it("όλα τα υπόλοιπα μη άδεια στο «Και άλλα», με πλήθος και σύνδεσμο· τα άδεια στη σιωπηλή γραμμή", () => {
    const result = brief([
      builtOf("my_deliverables", 3),
      builtOf("unanswered", 0),
      builtOf("readiness", 5),
      builtOf("overdue_invoices", 0),
    ]);
    expect(result.others).toEqual([
      {
        id: "my_deliverables",
        title: "Τίτλος my_deliverables",
        count: 3,
        href: "/app/my_deliverables",
        isFailed: false,
      },
      {
        id: "readiness",
        title: "Τίτλος readiness",
        count: 5,
        href: "/app/readiness",
        isFailed: false,
      },
    ]);
    expect(result.quiet.map((quiet) => quiet.id)).toEqual([
      "unanswered",
      "overdue_invoices",
    ]);
    expect(result.money).toBeNull();
    expect(result.overdue).toBe(0);
  });

  it("η Υγεία πάνω μόνο όταν κάτι χάλασε· αλλιώς ήσυχη γραμμή στο «Και άλλα»", () => {
    const ok = brief([builtOf("health", 0, "status")]);
    expect(ok.healthAlert).toBeNull();
    expect(ok.healthOk).toMatchObject({ id: "health", href: "/app/health" });

    const broken = brief([builtOf("health", 2, "status")]);
    expect(broken.healthAlert?.card.id).toBe("health");
    expect(broken.healthOk).toBeNull();

    const failed = brief([builtOf("health", 0, "status")], ["health"]);
    expect(failed.healthAlert?.card.id).toBe("health");
  });

  it("κάρτα που δεν φόρτωσε μπαίνει στο «Και άλλα» ως σφάλμα, ακόμα κι αν είναι απόφαση", () => {
    const result = brief(
      [builtOf("proposal_approvals", 0)],
      ["proposal_approvals"],
    );
    expect(result.decisions).toEqual([]);
    expect(result.hasDecisions).toBe(true);
    expect(result.isDecisionsPartial).toBe(true);
    expect(result.others).toEqual([
      expect.objectContaining({
        id: "proposal_approvals",
        isFailed: true,
        count: null,
      }),
    ]);
  });
});
