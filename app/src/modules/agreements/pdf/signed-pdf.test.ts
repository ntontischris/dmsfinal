import { inflateSync } from "node:zlib";

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

// Ένα έγκυρο PNG 1×1: ξεχωρίζει από το λογότυπο του brand (πλάτος 1601) μέσα στο PDF.
const TINY_PNG = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==",
  "base64",
);
const PNG_MAGIC = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];

// Τα γράμματα που έχουν οι ενσωματωμένες γραμματοσειρές του PDF, από τους πίνακες ToUnicode.
const embeddedLetters = (bytes: Uint8Array): Set<string> => {
  const raw = Buffer.from(bytes);
  const text = raw.toString("latin1");
  const letters = new Set<string>();
  for (const match of text.matchAll(/stream\r?\n/g)) {
    const start = match.index + match[0].length;
    const body = raw.subarray(start, text.indexOf("endstream", start));
    const cmap = (() => {
      try {
        return inflateSync(body).toString("latin1");
      } catch {
        return "";
      }
    })();
    if (!cmap.includes("begincmap")) continue;
    for (const target of cmap.matchAll(/\[([^\]]*)\]/g))
      for (const unit of target[1].matchAll(/[0-9a-f]{4}/gi))
        letters.add(String.fromCharCode(parseInt(unit[0], 16)));
  }
  return letters;
};

const renderWith = (logo: { bytes: Uint8Array } | null) =>
  renderSignedPdf({
    document: makeDocument(),
    language: "el",
    signedName: "Κώστας Υπογράφων",
    signedOn: "2026-12-01T10:00:00Z",
    logo,
  });

describe("renderSignedPdf", () => {
  it("should render a Greek signed agreement with the embedded font", async () => {
    const text = asText(await renderWith(null));
    expect(text.startsWith("%PDF-")).toBe(true);
    expect(text).toContain("Manrope");
    expect(text).not.toContain("/Helvetica");
  }, 30_000);

  it("should render an English document too", async () => {
    const bytes = await renderSignedPdf({
      document: makeDocument({ language: "en" }),
      language: "en",
      signedName: "Kostas Signer",
      signedOn: "2026-12-01",
      logo: null,
    });
    expect(asText(bytes).startsWith("%PDF-")).toBe(true);
  }, 30_000);

  // Το react-pdf κρατούσε τη γραμματοσειρά ανάμεσα στα PDF: μετά από ένα ελληνικό, το αγγλικό έχανε γράμματα.
  it("should keep every letter in a PDF rendered after another one", async () => {
    await renderWith(null);
    const bytes = await renderSignedPdf({
      document: makeDocument({ language: "en" }),
      language: "en",
      signedName: "Kostas Signer",
      signedOn: "2026-12-01",
      logo: null,
    });
    const letters = embeddedLetters(bytes);
    const missing = [...new Set("PROPOSALFORVAT")].filter(
      (letter) => !letters.has(letter),
    );
    expect(missing).toEqual([]);
  }, 60_000);
});

describe("renderSignedPdf logo", () => {
  it("should use the brand logo when the Company has none", async () => {
    expect(asText(await renderWith(null))).toContain("/Width 1601");
  }, 30_000);

  it("should use the Company logo when it is a PNG", async () => {
    const text = asText(await renderWith({ bytes: TINY_PNG }));
    expect(text).toMatch(/\/Width 1\s/);
    expect(text).not.toContain("/Width 1601");
  }, 30_000);

  it("should fall back to the brand logo for a WebP logo", async () => {
    const webp = Buffer.from("RIFF\0\0\0\0WEBPVP8 ", "latin1");
    expect(asText(await renderWith({ bytes: webp }))).toContain("/Width 1601");
  }, 30_000);

  it("should still render when the Company PNG is corrupt", async () => {
    const corrupt = Uint8Array.from([...PNG_MAGIC, 1, 2, 3, 4, 5, 6, 7, 8]);
    const text = asText(await renderWith({ bytes: corrupt }));
    expect(text.startsWith("%PDF-")).toBe(true);
    expect(text).toContain("/Width 1601");
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
