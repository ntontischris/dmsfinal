import { describe, expect, it } from "vitest";

import type { Step } from "@/spaces/kit/steps";

import type { Opportunity } from "../types";
import { relationshipSteps } from "./b2-adapter";
import {
  clientTabsFor,
  leadSentence,
  moneySentence,
  nextStepOf,
  resolveClientTab,
  stageOf,
  threeSteps,
} from "./b2-page-model";

const opportunity = (overrides: Partial<Opportunity> = {}): Opportunity => ({
  id: "o-1",
  clientId: "c-1",
  clientName: "Κυψέλη Καφέ",
  clientManagerId: "me",
  title: "Μηνιαίο social",
  stageId: "s-1",
  sourceId: "src",
  referredBy: "",
  managerId: "me",
  managerName: "Άννα Δημητρίου",
  outcome: "open",
  lossReasonId: null,
  nextStep: "Κλήση",
  nextStepDue: "2026-11-10",
  followsId: null,
  followsTitle: null,
  closedAt: null,
  createdAt: "2026-10-01T10:00:00Z",
  ...overrides,
});

const ledger = (
  overrides: Partial<{
    balance: number;
    overdue: number;
    toInvoice: number | null;
    hasEntries: boolean;
  }> = {},
) => ({
  balance: 0,
  overdue: 0,
  toInvoice: null,
  hasEntries: true,
  ...overrides,
});

describe("leadSentence", () => {
  it("should join every known fact into one sentence", () => {
    expect(
      leadSentence({
        stage: "Πρόταση",
        openCount: 3,
        activeAgreement: null,
        ledger: ledger(),
      }),
    ).toBe(
      "Σε στάδιο «Πρόταση», με 3 ανοιχτές Ευκαιρίες, χωρίς ενεργή Συμφωνία και χωρίς υπόλοιπο.",
    );
  });

  it("should name the active Agreement and a balance", () => {
    expect(
      leadSentence({
        stage: "Συμφωνία",
        openCount: 1,
        activeAgreement: "Social B",
        ledger: ledger({ balance: 120 }),
      }),
    ).toMatch(
      /^Σε στάδιο «Συμφωνία», με 1 ανοιχτή Ευκαιρία, με ενεργή Συμφωνία «Social B» και με υπόλοιπο 120/,
    );
  });

  it("should leave out what the viewer cannot see", () => {
    expect(
      leadSentence({
        stage: "Υποψήφιος",
        openCount: 0,
        activeAgreement: undefined,
        ledger: null,
      }),
    ).toBe("Σε στάδιο «Υποψήφιος» και χωρίς ανοιχτή Ευκαιρία.");
  });
});

describe("nextStepOf", () => {
  it("should pick the open Opportunity with the nearest next step", () => {
    const next = nextStepOf(
      [
        opportunity({ id: "far", nextStepDue: "2026-12-01" }),
        opportunity({ id: "won", outcome: "won", nextStepDue: "2026-11-01" }),
        opportunity({
          id: "near",
          nextStepDue: "2026-11-05",
          title: "Δεύτερο",
        }),
        opportunity({ id: "none", nextStepDue: null }),
      ],
      "2026-11-06",
    );
    expect(next).toMatchObject({
      opportunityId: "near",
      step: "Κλήση",
      due: "05/11/2026",
      title: "Δεύτερο",
      owner: "Άννα Δημητρίου",
      isLate: true,
    });
  });

  it("should return null without an open Opportunity with a date", () => {
    expect(
      nextStepOf(
        [opportunity({ outcome: "lost" }), opportunity({ nextStepDue: null })],
        "2026-11-06",
      ),
    ).toBeNull();
  });

  it("should name a missing step and a missing owner", () => {
    expect(
      nextStepOf(
        [opportunity({ nextStep: "", managerName: null })],
        "2026-11-06",
      ),
    ).toMatchObject({
      step: "Χωρίς περιγραφή",
      owner: "Χωρίς υπεύθυνο",
      isLate: false,
    });
  });
});

describe("moneySentence", () => {
  it("should say nothing when the ledger is not visible", () => {
    expect(moneySentence(null)).toBeNull();
  });

  it("should say there is no movement yet", () => {
    expect(moneySentence(ledger({ hasEntries: false }))).toBe(
      "Καμία κίνηση στην Καρτέλα Πελάτη ακόμα.",
    );
  });

  it("should never show a bare zero", () => {
    expect(moneySentence(ledger())).toBe("Δεν χρωστά τίποτα.");
  });

  it("should name the overdue part and what waits for invoicing", () => {
    const text = moneySentence(
      ledger({ balance: 500, overdue: 200, toInvoice: 300 }),
    );
    expect(text).toMatch(/^Χρωστά 500/);
    expect(text).toMatch(/από τα οποία 200.* ληξιπρόθεσμα\./);
    expect(text).toMatch(/Περιμένουν τιμολόγηση 300/);
  });

  it("should say when nothing is overdue", () => {
    expect(moneySentence(ledger({ balance: 500 }))).toMatch(
      /, τίποτα ληξιπρόθεσμο\.$/,
    );
  });

  it("should word a balance in the Client's favour", () => {
    expect(moneySentence(ledger({ balance: -400 }))).toMatch(
      /^Υπόλοιπο υπέρ του Πελάτη 400/,
    );
  });
});

describe("threeSteps", () => {
  it("should drop «Ανανέωση» and keep the current stage", () => {
    const steps = threeSteps(relationshipSteps([opportunity()], []));
    expect(steps.map((step) => step.label)).toEqual([
      "Υποψήφιος",
      "Πρόταση",
      "Συμφωνία",
    ]);
    expect(stageOf(steps)).toBe("Πρόταση");
  });

  it("should fall back to «Υποψήφιος» without a current step", () => {
    const steps: Step[] = [{ label: "Πρόταση", state: "done" }];
    expect(stageOf(steps)).toBe("Υποψήφιος");
  });
});

describe("resolveClientTab", () => {
  const all = clientTabsFor(
    [
      "details",
      "users",
      "opportunities",
      "agreements",
      "productions",
      "chat",
      "activities",
      "dispatches",
      "ledger",
    ],
    false,
  );

  it.each([
    ["details", "overview"],
    ["opportunities", "sales"],
    ["agreements", "sales"],
    ["productions", "productions"],
    ["ledger", "finance"],
    ["chat", "comms"],
    ["activities", "comms"],
    ["dispatches", "comms"],
    ["users", "users"],
  ])("should send the old tab %s to %s", (old, tab) => {
    expect(resolveClientTab(old, all)).toBe(tab);
  });

  it("should open the new tabs by their own name", () => {
    expect(resolveClientTab("finance", all)).toBe("finance");
    expect(resolveClientTab("comms", all)).toBe("comms");
  });

  it("should fall back to the overview for unknown or hidden tabs", () => {
    expect(resolveClientTab(undefined, all)).toBe("overview");
    expect(resolveClientTab("nope", all)).toBe("overview");
    const granted = clientTabsFor(
      ["details", "opportunities", "agreements"],
      false,
    );
    expect(granted).toEqual(["overview", "sales"]);
    expect(resolveClientTab("ledger", granted)).toBe("overview");
    expect(resolveClientTab("agreements", granted)).toBe("sales");
  });

  it("should open the users view for GDPR alone", () => {
    expect(clientTabsFor(["details", "opportunities"], true)).toContain(
      "users",
    );
  });
});
