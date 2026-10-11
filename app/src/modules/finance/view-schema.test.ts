import { describe, expect, it } from "vitest";

import { parseBillablesView } from "./view-schema";

// Φτιάχνει μία γραμμή «Προς τιμολόγηση» με προεπιλογές που μπορεί να αλλάξει κάθε τεστ.
function billableItem(overrides: Record<string, unknown> = {}) {
  return {
    id: "b1",
    billableOn: "2027-03-01",
    agreementId: "a1",
    agreementTitle: "Μηνιαίο Αθηνά",
    reason: "period",
    label: "Περίοδος Μάρτιος 2027",
    net: 1000,
    open: 1000,
    daysOpen: 10,
    reminders: [7],
    ...overrides,
  };
}

function billablesView(clients: unknown[] = []) {
  return { total: 1000, count: 1, clients };
}

describe("parseBillablesView", () => {
  it("should parse a view with one client and its open items", () => {
    const client = {
      clientId: "c1",
      clientName: "Καφέ Αθηνά",
      open: 1000,
      count: 1,
      oldestDays: 10,
      beyond: 0,
      items: [billableItem()],
    };

    expect(parseBillablesView(billablesView([client]))).toEqual(
      billablesView([client]),
    );
  });

  it("should accept an empty view when nothing waits for invoicing", () => {
    expect(parseBillablesView({ total: 0, count: 0, clients: [] })).toEqual({
      total: 0,
      count: 0,
      clients: [],
    });
  });

  it("should throw when an item has no net amount", () => {
    const broken = billableItem({ net: undefined });
    const client = {
      clientId: "c1",
      clientName: "X",
      open: 0,
      count: 1,
      oldestDays: 0,
      beyond: 0,
      items: [broken],
    };

    expect(() => parseBillablesView(billablesView([client]))).toThrow();
  });

  it("should throw when the payload is not a view", () => {
    expect(() => parseBillablesView(null)).toThrow();
  });
});
