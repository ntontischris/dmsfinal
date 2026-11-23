import { describe, expect, it } from "vitest";

import type { InvoiceItem } from "../invoices-view-schema";
import { clientOwedOf } from "./i2-client-model";

const invoice = (overrides: Partial<InvoiceItem> = {}): InvoiceItem => ({
  id: "i-58",
  number: "Α-58",
  kind: "invoice",
  clientId: "",
  clientName: "",
  issueDate: "2026-09-01",
  dueDate: "2026-10-01",
  total: 716,
  paid: 600,
  remaining: 116,
  status: "partial",
  creditForNumber: null,
  ...overrides,
});

describe("clientOwedOf", () => {
  it("should sum what remains on unpaid invoices and count them", () => {
    const owed = clientOwedOf([
      invoice(),
      invoice({ id: "i-59", remaining: 300, status: "overdue" }),
      invoice({ id: "i-60", remaining: 0, status: "paid" }),
    ]);
    expect(owed).toEqual({ owed: 416, overdue: 300, unpaidCount: 2 });
  });

  it("should leave credit notes out of what is owed", () => {
    const owed = clientOwedOf([
      invoice({ kind: "credit", remaining: 50, status: "credit" }),
    ]);
    expect(owed).toEqual({ owed: 0, overdue: 0, unpaidCount: 0 });
  });
});
