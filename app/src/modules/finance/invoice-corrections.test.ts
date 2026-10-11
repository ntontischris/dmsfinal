import { describe, expect, it } from "vitest";

import {
  correctionFormSchema,
  correctionPayload,
  voidFormSchema,
} from "./invoice-corrections-schemas";
import { changeText, correctHref, trailText } from "./invoice-detail-helpers";
import {
  parseInvoiceDetail,
  parseVoidedInvoices,
} from "./invoice-detail-schema";

const ID = "00000000-0000-4000-8000-0000000000a1";

const validForm = {
  id: ID,
  number: "Τ-100",
  issueDate: "2026-03-01",
  dueDate: "2026-03-16",
  net: "1000",
  vat: "240",
  total: "1240,00",
  mark: "400123",
  reason: "",
};

describe("correctionFormSchema", () => {
  it("accepts a full correction and reads amounts in Greek format", () => {
    const parsed = correctionFormSchema.parse(validForm);
    expect(parsed.total).toBe(1240);
    expect(parsed.dueDate).toBe("2026-03-16");
  });

  it("treats an empty due date as missing (credit notes)", () => {
    const parsed = correctionFormSchema.parse({ ...validForm, dueDate: "" });
    expect(parsed.dueDate).toBeNull();
    expect(correctionPayload(parsed)).not.toHaveProperty("dueDate");
  });

  it("rejects a non-numeric mark, an empty number and a zero total", () => {
    expect(
      correctionFormSchema.safeParse({ ...validForm, mark: "AB1" }).success,
    ).toBe(false);
    expect(
      correctionFormSchema.safeParse({ ...validForm, number: "  " }).success,
    ).toBe(false);
    expect(
      correctionFormSchema.safeParse({ ...validForm, total: "0" }).success,
    ).toBe(false);
  });

  it("keeps the reason optional", () => {
    expect(
      correctionFormSchema.safeParse({ ...validForm, reason: "λάθος ποσό" })
        .success,
    ).toBe(true);
  });
});

describe("voidFormSchema", () => {
  it("requires a reason", () => {
    expect(voidFormSchema.safeParse({ id: ID, reason: "   " }).success).toBe(
      false,
    );
    expect(
      voidFormSchema.safeParse({ id: ID, reason: "διπλή καταχώριση" }).success,
    ).toBe(true);
  });
});

describe("trail text", () => {
  it("writes old to new per field with Greek dates and money", () => {
    expect(
      changeText({ field: "dueDate", from: "2026-03-16", to: "2026-03-20" }),
    ).toBe("Λήξη: 16/03/2026 → 20/03/2026");
    expect(changeText({ field: "mark", from: null, to: "400123" })).toBe(
      "ΜΑΡΚ: — → 400123",
    );
    expect(changeText({ field: "total", from: 1240, to: 992 })).toContain("→");
  });

  it("joins action, changes and reason", () => {
    const text = trailText({
      at: "2026-03-02T10:00:00Z",
      byName: "Γιώργος",
      action: "corrected",
      changes: [{ field: "number", from: "A", to: "B" }],
      reason: "τυπογραφικό",
    });
    expect(text).toBe("Διόρθωση · Αριθμός: A → B · Λόγος: τυπογραφικό");
  });

  it("builds the correction link", () => {
    expect(correctHref(ID)).toBe(`/app/finance/invoices/new?invoice=${ID}`);
  });
});

describe("RPC shapes", () => {
  it("parses a voided list and a detail", () => {
    expect(parseVoidedInvoices([])).toEqual([]);
    const detail = parseInvoiceDetail({
      id: ID,
      kind: "invoice",
      number: "A-1",
      issueDate: "2026-03-01",
      dueDate: "2026-03-16",
      net: 100,
      vat: 24,
      total: 124,
      mark: null,
      clientId: ID,
      clientName: "Πελάτης",
      creditFor: null,
      creditForNumber: null,
      voided: null,
      trail: [],
      can: { correct: true, void: true },
    });
    expect(detail.can.void).toBe(true);
  });
});
