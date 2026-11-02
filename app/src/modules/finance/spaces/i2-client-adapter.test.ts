import { describe, expect, it } from "vitest";

import type { ClientInvoice } from "../ledger-view-schema";
import { clientInvoiceRowOf } from "./i2-client-adapter";
import { visibleInvoices } from "./i2-model";

const invoice = (overrides: Partial<ClientInvoice> = {}): ClientInvoice => ({
  id: "inv-1",
  number: "Α-12",
  kind: "invoice",
  issueDate: "2026-10-01",
  dueDate: "2026-10-31",
  total: 620,
  paid: 0,
  remaining: 620,
  status: "unpaid",
  creditForNumber: null,
  ...overrides,
});

describe("clientInvoiceRowOf", () => {
  it("should keep the invoice fields and leave the client empty", () => {
    const row = clientInvoiceRowOf(invoice());
    expect(row).toMatchObject({ id: "inv-1", number: "Α-12", remaining: 620 });
    expect(row.clientId).toBe("");
    expect(row.clientName).toBe("");
  });

  it("should let the team filters work on client rows", () => {
    const rows = [
      invoice({ id: "a" }),
      invoice({ id: "b", remaining: 0, paid: 620, status: "paid" }),
    ].map(clientInvoiceRowOf);
    expect(visibleInvoices(rows, "unpaid").map((row) => row.id)).toEqual(["a"]);
  });
});
