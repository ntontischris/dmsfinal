import { describe, expect, it } from "vitest";

import {
  addDays,
  amountOf,
  canSubmit,
  coverageOf,
  coverageText,
  dueOf,
  emptyDraft,
  expectedVat,
  hasTaxMismatch,
  warningsOf,
  withNet,
  type DraftForm,
} from "./invoices-model";
import type { InvoiceContext } from "./invoices-view-schema";

const TODAY = "2026-06-03";

const context = (overrides: Partial<InvoiceContext> = {}): InvoiceContext => ({
  clientName: "Καφέ Αθηνά",
  clientTaxId: "123456789",
  vatRate: 24,
  paymentDays: 20,
  toInvoice: 1300,
  openBillables: [],
  existingNumbers: [],
  invoices: [],
  ...overrides,
});

const draft = (overrides: Partial<DraftForm> = {}): DraftForm => ({
  ...emptyDraft(TODAY),
  number: "87",
  net: "1300",
  vat: "312",
  total: "1612",
  ...overrides,
});

describe("addDays και dueOf", () => {
  it("should add the payment days to the issue date", () => {
    expect(addDays("2026-06-03", 20)).toBe("2026-06-23");
  });

  it("should cross a month and a year boundary", () => {
    expect(addDays("2026-12-20", 15)).toBe("2027-01-04");
  });

  it("should return empty text for an invalid date", () => {
    expect(addDays("", 15)).toBe("");
  });

  it("should prefill the due date from the payment days until the user overrides it", () => {
    expect(dueOf(draft(), 20)).toBe("2026-06-23");
    expect(dueOf(draft({ dueOverride: "2026-07-01" }), 20)).toBe("2026-07-01");
  });
});

describe("expectedVat και withNet", () => {
  it("should use the rate of the context, not a constant", () => {
    expect(expectedVat(1000, 24)).toBe(240);
    expect(expectedVat(1000, 13)).toBe(130);
  });

  it("should prefill VAT and total from the net while the amounts are automatic", () => {
    const next = withNet(emptyDraft(TODAY), "1300", 24);

    expect(next.vat).toBe("312");
    expect(next.total).toBe("1612");
  });

  it("should keep the VAT and total the user typed", () => {
    const edited = {
      ...emptyDraft(TODAY),
      vat: "300",
      total: "1600",
      autoAmounts: false,
    };

    const next = withNet(edited, "1300", 24);

    expect(next.net).toBe("1300");
    expect(next.vat).toBe("300");
    expect(next.total).toBe("1600");
  });

  it("should clear the automatic amounts when the net is emptied", () => {
    const next = withNet(draft(), "", 24);

    expect(next.vat).toBe("");
    expect(next.total).toBe("");
  });
});

describe("amountOf", () => {
  it("should read a comma decimal and treat bad text as zero", () => {
    expect(amountOf("150,50")).toBe(150.5);
    expect(amountOf("abc")).toBe(0);
  });
});

describe("warningsOf", () => {
  it("should give no warning for matching amounts", () => {
    expect(warningsOf(draft(), context())).toEqual([]);
  });

  it("should warn when net + VAT is not the total", () => {
    const warnings = warningsOf(draft({ total: "1700" }), context());

    expect(warnings.map((warning) => warning.text)).toContain(
      "Το καθαρό + ΦΠΑ δεν βγάζει το σύνολο.",
    );
  });

  it("should compare the VAT with the rate of the context", () => {
    const warnings = warningsOf(
      draft({ net: "1000", vat: "130", total: "1130" }),
      context({ vatRate: 13, toInvoice: 1000 }),
    );

    expect(warnings).toEqual([]);
    const wrong = warningsOf(
      draft({ net: "1000", vat: "240", total: "1240" }),
      context({ vatRate: 13, toInvoice: 1000 }),
    );
    expect(wrong.map((warning) => warning.text)).toContain(
      "Το ΦΠΑ δεν είναι 13% του καθαρού.",
    );
  });

  it("should warn when the net differs from what is to be invoiced", () => {
    const warnings = warningsOf(
      draft({ net: "1000", vat: "240", total: "1240" }),
      context(),
    );

    expect(warnings[0]?.text).toContain("300,00");
    expect(warnings[0]?.text).toContain("λιγότερο");
  });

  it("should not compare a credit note with the amount to invoice", () => {
    const warnings = warningsOf(
      draft({ kind: "credit", net: "100", vat: "24", total: "124" }),
      context(),
    );

    expect(warnings).toEqual([]);
  });

  it("should warn strongly about a different tax id", () => {
    const warnings = warningsOf(draft({ pdfTaxId: "111111111" }), context());

    expect(warnings).toHaveLength(1);
    expect(warnings[0]?.isStrong).toBe(true);
  });

  it("should not compare the tax id when the client has none", () => {
    expect(
      hasTaxMismatch(
        draft({ pdfTaxId: "111111111" }),
        context({ clientTaxId: null }),
      ),
    ).toBe(false);
  });

  it("should warn about a duplicate number of the same client", () => {
    const warnings = warningsOf(draft(), context({ existingNumbers: ["87"] }));

    expect(warnings.map((warning) => warning.text)).toContain(
      "Ο αριθμός 87 υπάρχει ήδη για αυτόν τον Πελάτη (πιθανό διπλό).",
    );
  });
});

describe("canSubmit", () => {
  it("should need the file, the number, the date and a positive total", () => {
    expect(canSubmit(draft(), context(), true)).toBe(true);
    expect(canSubmit(draft(), context(), false)).toBe(false);
    expect(canSubmit(draft({ number: " " }), context(), true)).toBe(false);
    expect(canSubmit(draft({ total: "0" }), context(), true)).toBe(false);
  });

  it("should need the invoice a credit note corrects", () => {
    expect(canSubmit(draft({ kind: "credit" }), context(), true)).toBe(false);
    expect(
      canSubmit(draft({ kind: "credit", creditFor: "inv-1" }), context(), true),
    ).toBe(true);
  });

  it("should need the confirmation tick only for a different tax id", () => {
    const mismatched = draft({ pdfTaxId: "111111111" });

    expect(canSubmit(mismatched, context(), true)).toBe(false);
    expect(
      canSubmit({ ...mismatched, taxIdConfirmed: true }, context(), true),
    ).toBe(true);
  });
});

describe("coverageOf", () => {
  const open = [
    {
      id: "b1",
      label: "Περίοδος Ιούνιος",
      billableOn: "2026-06-01",
      open: 1300,
    },
    {
      id: "b2",
      label: "Περίοδος Ιούλιος",
      billableOn: "2026-07-01",
      open: 1000,
    },
  ];

  it("should cover the oldest billable first and keep the rest open", () => {
    const { rows, beyond } = coverageOf(open, 1500);

    expect(rows.map((row) => row.covered)).toEqual([1300, 200]);
    expect(rows.map((row) => row.left)).toEqual([0, 800]);
    expect(beyond).toBe(0);
  });

  it("should report what is invoiced beyond the billables", () => {
    expect(coverageOf(open, 2500).beyond).toBe(200);
  });

  it("should cover nothing for zero net", () => {
    expect(coverageOf(open, 0).rows.every((row) => row.covered === 0)).toBe(
      true,
    );
  });

  it("should describe the cover in words", () => {
    const { rows } = coverageOf(open, 1500);

    expect(coverageText(rows[0]!)).toBe("καλύπτεται πλήρως");
    expect(coverageText(rows[1]!)).toContain("μένει");
    expect(coverageText(coverageOf(open, 0).rows[0]!)).toBe("μένει ανοιχτό");
  });
});
