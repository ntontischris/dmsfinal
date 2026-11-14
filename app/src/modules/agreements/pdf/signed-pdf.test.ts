import { describe, expect, it } from "vitest";

import type { ProposalDocument } from "../types";
import { renderSignedPdf } from "./signed-pdf";
import {
  capsOf,
  signedPdfFileName,
  signedPdfLabels,
} from "./signed-pdf-labels";

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
        {
          quantity: 2,
          label: "Γυρίσματα",
          labelEn: "Shoots",
          unit: "",
          unitEn: "",
        },
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

const asText = (bytes: Uint8Array): string =>
  Buffer.from(bytes).toString("latin1");

describe("renderSignedPdf", () => {
  it("should render a Greek signed agreement with the embedded font", async () => {
    const bytes = await renderSignedPdf({
      document: makeDocument(),
      language: "el",
      signedName: "Κώστας Υπογράφων",
      signedOn: "2026-12-01T10:00:00Z",
    });
    const text = asText(bytes);
    expect(text.startsWith("%PDF-")).toBe(true);
    expect(text).toContain("InterTight");
    expect(text).not.toContain("/Helvetica");
  }, 30_000);

  it("should render an English document too", async () => {
    const bytes = await renderSignedPdf({
      document: makeDocument({ language: "en" }),
      language: "en",
      signedName: "Kostas Signer",
      signedOn: "2026-12-01",
    });
    expect(asText(bytes).startsWith("%PDF-")).toBe(true);
  }, 30_000);
});

describe("signedPdfLabels", () => {
  it("should name the signer and the date in each language", () => {
    expect(signedPdfLabels("el").signedBy("Κώστας", "2026-12-01")).toBe(
      "Υπογράφηκε από Κώστας στις 01/12/2026.",
    );
    expect(signedPdfLabels("en").signedBy("Kostas", "2026-12-01")).toBe(
      "Signed by Kostas on 01/12/2026.",
    );
  });

  it("should give a Latin-only file name", () => {
    expect(signedPdfFileName("0d3f9a2b-1111-4222-8333-444455556666")).toBe(
      "agreement-0d3f9a2b-signed.pdf",
    );
  });
});

describe("capsOf", () => {
  it("should drop the Greek accent but keep the diaeresis", () => {
    expect(capsOf("Τι περιλαμβάνει")).toBe("ΤΙ ΠΕΡΙΛΑΜΒΑΝΕΙ");
    expect(capsOf("Όροι")).toBe("ΟΡΟΙ");
    expect(capsOf("προϊόν")).toBe("ΠΡΟΪΟΝ");
    expect(capsOf("Signature")).toBe("SIGNATURE");
  });
});
