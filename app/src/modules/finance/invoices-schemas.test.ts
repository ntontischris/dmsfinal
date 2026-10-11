import { describe, expect, it } from "vitest";

import {
  hasPdfHeader,
  invoiceFormSchema,
  pdfFileProblem,
  PDF_MAX_BYTES,
} from "./invoices-schemas";

const CLIENT = "6f1c2f1e-3b0a-4d6e-9d52-0a1b2c3d4e5f";
const INVOICE = "1c2d3e4f-5a6b-4c7d-8e9f-0a1b2c3d4e5f";

const validForm = {
  clientId: CLIENT,
  kind: "invoice",
  number: "  87  ",
  issueDate: "2026-06-03",
  dueDate: "",
  net: "1300",
  vat: "312,00",
  total: "1612",
  mark: "",
  pdfTaxId: "",
  creditFor: "",
  taxIdConfirmed: "",
};

describe("invoiceFormSchema", () => {
  it("should parse a valid form and normalise empty optional fields to null", () => {
    const parsed = invoiceFormSchema.parse(validForm);

    expect(parsed.number).toBe("87");
    expect(parsed.vat).toBe(312);
    expect(parsed.dueDate).toBeNull();
    expect(parsed.mark).toBeNull();
    expect(parsed.pdfTaxId).toBeNull();
    expect(parsed.creditFor).toBeNull();
    expect(parsed.taxIdConfirmed).toBe(false);
  });

  it("should read the checked box as a confirmation", () => {
    expect(
      invoiceFormSchema.parse({ ...validForm, taxIdConfirmed: "on" })
        .taxIdConfirmed,
    ).toBe(true);
  });

  it("should accept a zero net but not a zero total", () => {
    expect(
      invoiceFormSchema.safeParse({ ...validForm, net: "0" }).success,
    ).toBe(true);
    expect(
      invoiceFormSchema.safeParse({ ...validForm, total: "0" }).success,
    ).toBe(false);
  });

  it("should refuse a MARK that is not digits", () => {
    expect(
      invoiceFormSchema.safeParse({ ...validForm, mark: "ABC123" }).success,
    ).toBe(false);
    expect(
      invoiceFormSchema.parse({ ...validForm, mark: "400012345678901" }).mark,
    ).toBe("400012345678901");
  });

  it("should refuse a bad amount with the message the user sees", () => {
    const parsed = invoiceFormSchema.safeParse({ ...validForm, net: "12,345" });

    expect(parsed.success).toBe(false);
    expect(parsed.error?.issues[0]?.message).toBe(
      "Γράψε ποσό σε ευρώ, π.χ. 1300 ή 1300,50.",
    );
  });

  it("should need the corrected invoice for a credit note", () => {
    expect(
      invoiceFormSchema.safeParse({ ...validForm, kind: "credit" }).success,
    ).toBe(false);
    expect(
      invoiceFormSchema.safeParse({
        ...validForm,
        kind: "credit",
        creditFor: INVOICE,
      }).success,
    ).toBe(true);
  });

  it("should refuse an unknown kind and a missing client", () => {
    expect(
      invoiceFormSchema.safeParse({ ...validForm, kind: "offer" }).success,
    ).toBe(false);
    expect(
      invoiceFormSchema.safeParse({ ...validForm, clientId: "" }).success,
    ).toBe(false);
  });

  it("should refuse a number longer than 40 characters", () => {
    expect(
      invoiceFormSchema.safeParse({ ...validForm, number: "x".repeat(41) })
        .success,
    ).toBe(false);
  });
});

describe("pdfFileProblem", () => {
  const pdf = (size: number, type = "application/pdf") =>
    new File([new Uint8Array(size)], "a.pdf", { type });

  it("should accept a non-empty PDF within the limit", () => {
    expect(pdfFileProblem(pdf(10))).toBeNull();
  });

  it("should refuse an empty file, a big file, another type and a missing file", () => {
    expect(pdfFileProblem(pdf(0))).not.toBeNull();
    expect(pdfFileProblem(pdf(PDF_MAX_BYTES + 1))).not.toBeNull();
    expect(pdfFileProblem(pdf(10, "image/png"))).not.toBeNull();
    expect(pdfFileProblem(null)).not.toBeNull();
    expect(pdfFileProblem("text")).not.toBeNull();
  });
});

describe("hasPdfHeader", () => {
  it("should recognise the PDF signature and refuse other bytes", () => {
    expect(hasPdfHeader(new TextEncoder().encode("%PDF-1.4"))).toBe(true);
    expect(hasPdfHeader(new TextEncoder().encode("GIF89a"))).toBe(false);
    expect(hasPdfHeader(new Uint8Array([1, 2]))).toBe(false);
  });
});
