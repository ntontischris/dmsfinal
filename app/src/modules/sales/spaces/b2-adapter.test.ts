import { describe, expect, it } from "vitest";

import type { AgreementRow } from "@/modules/agreements";

import type { Opportunity } from "../types";
import {
  activeAgreementText,
  allowedTabs,
  clientSummary,
  opportunityRows,
  relationshipSteps,
  type B2TabRights,
} from "./b2-adapter";

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

const agreement = (overrides: Partial<AgreementRow> = {}): AgreementRow => ({
  id: "a-1",
  opportunityId: "o-1",
  clientId: "c-1",
  clientName: "Κυψέλη Καφέ",
  title: "Social B",
  kind: "monthly",
  state: "active",
  path: "signed",
  revision: 1,
  managerId: "me",
  managerName: "Άννα",
  validUntil: "2026-10-30",
  startOn: "2026-10-01",
  endOn: "2026-12-31",
  signedAt: "2026-09-30T10:00:00Z",
  signatoryName: "Μαρία",
  total: 900,
  discountPercent: null,
  discountMonths: null,
  changeRequestsOpen: 0,
  linksOpened: 1,
  expiresInDays: null,
  isLowMargin: false,
  updatedAt: "2026-10-01T10:00:00Z",
  ...overrides,
});

const allRights: B2TabRights = {
  details: true,
  users: true,
  opportunities: true,
  agreements: true,
  productions: true,
  chat: true,
  activities: true,
  dispatches: true,
  ledger: true,
};

describe("allowedTabs", () => {
  it("should show only tabs the user has rights for", () => {
    expect(
      allowedTabs({ ...allRights, ledger: false, users: false }, false),
    ).toEqual([
      "details",
      "opportunities",
      "agreements",
      "productions",
      "chat",
      "activities",
      "dispatches",
    ]);
  });

  it("should limit access through own opportunity to summary, opportunities and agreements", () => {
    expect(allowedTabs(allRights, true)).toEqual([
      "details",
      "opportunities",
      "agreements",
    ]);
  });
});

describe("relationshipSteps", () => {
  it("should be at candidate without opportunities or agreements", () => {
    expect(relationshipSteps([], []).map((step) => step.state)).toEqual([
      "current",
      "todo",
      "todo",
      "todo",
    ]);
  });

  it("should be at proposal with an open opportunity", () => {
    expect(relationshipSteps([opportunity()], [])[1]?.state).toBe("current");
  });

  it("should be at agreement with an active agreement", () => {
    expect(
      relationshipSteps([], [agreement()]).map((step) => step.state),
    ).toEqual(["done", "done", "current", "todo"]);
  });
});

describe("clientSummary", () => {
  it("should list risks first, then agreement end, balance and next filming", () => {
    const lines = clientSummary({
      agreements: [agreement()],
      ledger: { balance: 500, overdue: 200, toInvoice: 0 },
      opportunities: [opportunity({ nextStepDue: "2026-10-20" })],
      nextFilming: "2026-11-05T08:30:00Z",
      today: "2026-11-02",
    });
    expect(lines.map((line) => line.label)).toEqual([
      "Χρειάζεται προσοχή",
      "Συμφωνία",
      "Υπόλοιπο",
      "Επόμενο γύρισμα",
    ]);
    expect(lines[0]?.tab).toBe("opportunities");
    expect(lines[1]?.text).toBe("«Social B» λήγει 31/12/2026 (σε 59 μέρες)");
    expect(lines[3]?.text).toBe("05/11/2026 10:30");
  });

  it("should be empty when nothing is going on", () => {
    expect(
      clientSummary({
        agreements: [],
        ledger: null,
        opportunities: [],
        nextFilming: null,
        today: "2026-11-02",
      }),
    ).toEqual([]);
  });
});

describe("opportunityRows", () => {
  it("should show stage, forgotten flag and the proposal link", () => {
    const [withAgreement, without] = opportunityRows({
      opportunities: [
        opportunity({ nextStepDue: "2026-10-01" }),
        opportunity({ id: "o-2", managerId: "other" }),
      ],
      stageLabels: { "s-1": "Πρόταση" },
      agreements: [agreement()],
      clientManagerId: "me",
      canPropose: true,
      today: "2026-11-02",
    });
    expect(withAgreement).toMatchObject({
      badge: "Πρόταση",
      tone: "strong",
      isForgotten: true,
      href: "/app/pipeline/o-1",
      proposal: { href: "/app/agreements/a-1", label: "Πρόταση" },
    });
    expect(without?.proposal).toEqual({
      href: "/app/pipeline/o-2",
      label: "Νέα πρόταση",
    });
    expect(without?.sub).toContain("με πρόσβαση");
  });

  it("should show the outcome for a closed opportunity and no proposal", () => {
    const [row] = opportunityRows({
      opportunities: [opportunity({ outcome: "won" })],
      stageLabels: {},
      agreements: [],
      clientManagerId: "me",
      canPropose: true,
      today: "2026-11-02",
    });
    expect(row).toMatchObject({
      badge: "Κερδισμένη",
      tone: "ok",
      proposal: null,
    });
  });
});

describe("activeAgreementText", () => {
  it("should show the active agreement with its monthly amount", () => {
    expect(activeAgreementText([agreement()])).toMatch(
      /^Social B · 900\s€ \/ μήνα$/,
    );
    expect(activeAgreementText([agreement({ total: null })])).toBe("Social B");
    expect(activeAgreementText([])).toBeNull();
  });
});
