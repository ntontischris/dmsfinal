import { describe, expect, it } from "vitest";

import type { ProposalDocument } from "../types";
import { deadMessagesOf, documentOf } from "./d5-adapter";

const makeDocument = (
  overrides: Partial<ProposalDocument> = {},
): ProposalDocument => ({
  revision: 2,
  language: "el",
  title: "Μηνιαία Παρουσία",
  kind: "monthly",
  validUntil: "2026-11-30",
  startOn: null,
  durationMonths: 12,
  company: {
    legalName: "Devre Media ΙΚΕ",
    tradeName: "Devre Media",
    taxId: "123456789",
    taxOffice: "Α' Αθηνών",
    gemi: "",
    address: "",
    phone: "210 0000000",
    email: "hello@example.com",
    signatoryName: "Νίκος",
    signatoryTitle: "Διαχειριστής",
  },
  client: { name: "Κυψέλη", legalName: "Κυψέλη ΑΕ", afm: null, city: "Αθήνα" },
  lines: [
    {
      description: "Social πακέτο",
      descriptionEn: "Social package",
      unit: "μήνας",
      quantity: 1,
      unitPrice: 1300,
      lineTotal: 1300,
      provisions: [
        { quantity: 2, label: "Γυρίσματα", labelEn: "Shoots", unit: "", unitEn: "" },
        { quantity: 8, label: "reels", labelEn: "", unit: "", unitEn: "" },
      ],
    },
  ],
  provisionTotals: [],
  totals: {
    net: 1300,
    discountPercent: 0,
    discountMonths: 0,
    discountedNet: 1300,
    vatRate: 24,
    vat: 312,
    gross: 1612,
    discountedVat: 312,
    discountedGross: 1612,
  },
  terms: {
    paymentDays: 15,
    unusedProvisions: "lost",
    graceDays: 0,
    renewal: null,
    dissolutionNoticeDays: 30,
    dissolutionFee: 0,
    filmingNoticeHours: 48,
    filmingCancelHours: 24,
    lateCancelBurns: true,
    noShowBurns: true,
    revisionLimits: [],
  },
  milestones: [],
  ...overrides,
});

describe("documentOf", () => {
  it("should show the client, price per month and VAT in Greek", () => {
    const doc = documentOf(makeDocument(), "el");
    expect(doc.proposalFor).toBe("Πρόταση προς Κυψέλη ΑΕ");
    expect(doc.brand).toBe("Devre Media");
    expect(doc.lines[0]?.sub).toBe("2 × Γυρίσματα, 8 × reels");
    expect(doc.lines[0]?.amount).toMatch(/1\.300,00\s€ \/ μήνα/);
    expect(doc.price.map((p) => p.label)).toContain("ΦΠΑ 24%");
    expect(doc.price.find((p) => p.isStrong)?.value).toMatch(/1\.612,00\s€/);
  });

  it("should fall back to Greek text when the English one is missing", () => {
    const doc = documentOf(makeDocument({ language: "en" }), "en");
    expect(doc.lines[0]?.title).toBe("Social package");
    expect(doc.lines[0]?.sub).toBe("2 × Shoots, 8 × reels");
    expect(doc.proposalFor).toBe("Proposal for Κυψέλη ΑΕ");
  });

  it("should list only payment terms and instalments for a one-off proposal", () => {
    const doc = documentOf(
      makeDocument({
        kind: "one_off",
        durationMonths: null,
        milestones: [
          { trigger: "signature", percent: 50, dueOn: null, amount: 650 },
        ],
      }),
      "el",
    );
    expect(doc.terms).toHaveLength(1);
    expect(doc.priceNotes).toHaveLength(0);
    expect(doc.instalments[0]).toContain("με την υπογραφή");
  });

  it("should leave out empty legal parts", () => {
    const doc = documentOf(makeDocument(), "el");
    expect(doc.legal).toEqual([
      "Devre Media ΙΚΕ",
      "ΑΦΜ 123456789 · ΔΟΥ Α' Αθηνών",
      "210 0000000 · hello@example.com",
    ]);
  });
});

describe("deadMessagesOf", () => {
  it("should show both languages when the link is unknown", () => {
    const messages = deadMessagesOf({
      kind: "unknown",
      language: null,
      managerName: null,
      company: null,
    });
    expect(messages.map((m) => m.title)).toEqual([
      "Ο σύνδεσμος δεν βρέθηκε",
      "This link was not found",
    ]);
    expect(messages[0]?.contact).toBeNull();
  });

  it("should name the manager to contact for a superseded link", () => {
    const [message] = deadMessagesOf({
      kind: "superseded",
      language: "el",
      managerName: "Άννα Πωλήσεις",
      company: { name: "Devre Media", phone: "", email: "a@example.com" },
    });
    expect(message?.title).toContain("Υπάρχει νεότερη έκδοση της πρότασης");
    expect(message?.contact).toBe("Επικοινωνήστε με Άννα Πωλήσεις.");
    expect(message?.reach).toBe("a@example.com");
  });

  it("should put the expiry date in the title", () => {
    const [message] = deadMessagesOf({
      kind: "expired",
      language: "el",
      managerName: null,
      company: null,
      date: "2026-10-01",
    });
    expect(message?.title).toMatch(/^Η πρόταση έληξε στις \d/);
  });
});
