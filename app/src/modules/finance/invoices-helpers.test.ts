import { describe, expect, it } from "vitest";

import {
  filterHref,
  invoicesToCsv,
  newInvoiceHref,
  parseInvoiceFilter,
  pdfHref,
  statusTone,
} from "./invoices-helpers";
import { STATUS_LABELS } from "./invoices-labels";
import type { InvoiceItem } from "./invoices-view-schema";

const row = (overrides: Partial<InvoiceItem> = {}): InvoiceItem => ({
  id: "inv-1",
  number: "87",
  kind: "invoice",
  clientId: "c1",
  clientName: "Καφέ Αθηνά",
  issueDate: "2026-06-03",
  dueDate: "2026-06-23",
  total: 1612,
  paid: 0,
  remaining: 1612,
  status: "unpaid",
  creditForNumber: null,
  ...overrides,
});

describe("parseInvoiceFilter και filterHref", () => {
  it("should default to all for an unknown or missing value", () => {
    expect(parseInvoiceFilter(undefined)).toBe("all");
    expect(parseInvoiceFilter("zzz")).toBe("all");
    expect(parseInvoiceFilter("overdue")).toBe("overdue");
  });

  it("should keep the filter in the address, and nothing for all", () => {
    expect(filterHref("all")).toBe("/app/finance/invoices");
    expect(filterHref("credit")).toBe("/app/finance/invoices?filter=credit");
  });
});

describe("links", () => {
  it("should build the register and PDF links", () => {
    expect(newInvoiceHref()).toBe("/app/finance/invoices/new");
    expect(newInvoiceHref("c 1")).toBe(
      "/app/finance/invoices/new?client=c%201",
    );
    expect(pdfHref("inv-1")).toBe("/app/finance/invoices/inv-1/pdf");
  });
});

describe("statusTone και κείμενο κατάστασης", () => {
  it("should colour overdue as attention and paid as ok", () => {
    expect(statusTone("overdue")).toBe("attention");
    expect(statusTone("paid")).toBe("ok");
    expect(statusTone("credit")).toBeUndefined();
    expect(statusTone("partial")).toBe("strong");
  });

  it("should name every status in Greek", () => {
    expect(STATUS_LABELS.unpaid).toBe("ανεξόφλητο");
    expect(STATUS_LABELS.partial).toBe("μερικώς εξοφλημένο");
    expect(STATUS_LABELS.overdue).toBe("ληξιπρόθεσμο");
    expect(STATUS_LABELS.paid).toBe("εξοφλημένο");
    expect(STATUS_LABELS.credit).toBe("πιστωτικό");
  });
});

describe("invoicesToCsv", () => {
  it("should start with the BOM and write a header and one line per invoice", () => {
    const csv = invoicesToCsv([row()]);

    expect(csv.startsWith("﻿")).toBe(true);
    const lines = csv.slice(1).split("\r\n");
    expect(lines).toHaveLength(2);
    expect(lines[1]).toContain("87;τιμολόγιο;Καφέ Αθηνά;03/06/2026;23/06/2026");
    expect(lines[1]).toContain("ανεξόφλητο");
  });

  it("should leave the due date empty for a credit note and protect formulas", () => {
    const csv = invoicesToCsv([
      row({ kind: "credit", dueDate: null, status: "credit", number: "=1+1" }),
    ]);

    expect(csv).toContain("'=1+1;πιστωτικό");
    expect(csv).toContain("03/06/2026;;");
  });
});
