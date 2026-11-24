import { describe, expect, it } from "vitest";

import type { ClientInvoice, PaymentInfo } from "../ledger-view-schema";
import { contactLinksOf, needsPayment, ownInvoiceOf } from "./i8-client-model";

const invoice = (overrides: Partial<ClientInvoice> = {}): ClientInvoice => ({
  id: "inv-own",
  number: "Α-58",
  kind: "invoice",
  issueDate: "2026-09-01",
  dueDate: "2026-10-01",
  total: 716,
  paid: 600,
  remaining: 116,
  status: "partial",
  creditForNumber: null,
  ...overrides,
});

const company = (
  overrides: Partial<PaymentInfo["company"]> = {},
): PaymentInfo["company"] => ({
  name: "Εταιρεία Δοκιμής",
  phone: "210 000 0000",
  email: "info@example.com",
  ...overrides,
});

describe("ownInvoiceOf", () => {
  it("should find the invoice when it is in the client's own list", () => {
    expect(ownInvoiceOf([invoice()], "inv-own")?.number).toBe("Α-58");
  });

  it("should deny an invoice of another client, because it is never in the client's own list", () => {
    expect(ownInvoiceOf([invoice()], "inv-of-another-client")).toBeNull();
  });

  it("should deny everything when the client has no invoices", () => {
    expect(ownInvoiceOf([], "inv-own")).toBeNull();
  });
});

describe("needsPayment", () => {
  it("should ask for payment when something remains on an invoice", () => {
    expect(needsPayment(invoice())).toBe(true);
  });

  it("should not ask for payment when the invoice is paid", () => {
    expect(needsPayment(invoice({ remaining: 0, status: "paid" }))).toBe(false);
  });

  it("should never ask for payment on a credit note", () => {
    expect(
      needsPayment(
        invoice({ kind: "credit", status: "credit", remaining: 50 }),
      ),
    ).toBe(false);
  });
});

describe("contactLinksOf", () => {
  it("should give phone and email as tel and mailto links", () => {
    expect(contactLinksOf(company())).toEqual([
      { label: "Τηλέφωνο", value: "210 000 0000", href: "tel:2100000000" },
      {
        label: "Email",
        value: "info@example.com",
        href: "mailto:info@example.com",
      },
    ]);
  });

  it("should leave out what the company has not filled in", () => {
    expect(contactLinksOf(company({ phone: " ", email: "" }))).toEqual([]);
  });

  it("should keep a leading plus in the phone link", () => {
    expect(
      contactLinksOf(company({ phone: "+30 210 1234567", email: "" })),
    ).toEqual([
      {
        label: "Τηλέφωνο",
        value: "+30 210 1234567",
        href: "tel:+302101234567",
      },
    ]);
  });
});
