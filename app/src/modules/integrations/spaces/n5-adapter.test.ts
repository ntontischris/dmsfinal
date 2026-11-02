import { describe, expect, it } from "vitest";

import type { ConnectionStatus } from "../connections";
import type { Subscription } from "../schemas";
import { lastOkOf, n5CardOf, n5SubRowOf, n5TotalsOf } from "./n5-adapter";

const connection = (overrides: Partial<ConnectionStatus> = {}): ConnectionStatus => ({
  id: "email",
  state: "ok",
  reason: "",
  lastSuccessAt: "2026-10-20T07:45:00Z",
  usage: { label: "Emails σήμερα", used: 80, limit: 100, unit: "emails" },
  models: [],
  isCheckable: true,
  lastCheck: null,
  ...overrides,
});

const subscription = (overrides: Partial<Subscription> = {}): Subscription => ({
  id: "s-1",
  provider: "Vercel",
  covers: "Φιλοξενία",
  plan: "Pro",
  monthlyCost: 20,
  currency: "USD",
  renewsOn: "2026-11-05",
  account: "εταιρεία",
  paidBy: "Ιδιοκτήτης",
  link: "https://vercel.com",
  updatedAt: "2026-10-01T00:00:00Z",
  ...overrides,
});

describe("n5CardOf", () => {
  it("should show a working connection with the prototype's strong tone and usage", () => {
    const card = n5CardOf(connection());
    expect(card).toMatchObject({
      name: "Αποστολή email",
      status: "λειτουργεί",
      tone: "strong",
      isDown: false,
      warning: null,
    });
    expect(card.usage).toMatchObject({ ratio: 0.8, used: 80, limit: 100 });
    expect(card.usage?.text).toBe("80 από 100 emails");
  });

  it("should flag a down connection with its reason", () => {
    expect(n5CardOf(connection({ state: "down", reason: "Δεν απαντά." }))).toMatchObject({
      tone: "attention",
      isDown: true,
      warning: "Δεν απαντά.",
    });
  });

  it("should leave a connection that is not set up neutral", () => {
    const card = n5CardOf(connection({ state: "not_set_up", usage: null }));
    expect(card.tone).toBeUndefined();
    expect(card.isNotSetUp).toBe(true);
    expect(card.usage).toBeNull();
  });

  it("should list the last check and the AI models as facts", () => {
    const card = n5CardOf(
      connection({
        id: "ai",
        lastCheck: { at: "2026-10-20T07:45:00Z", isOk: false, error: "401" },
        models: [{ label: "Βοηθός", id: "model-x" }],
      }),
    );
    expect(card.facts.map((fact) => fact.label)).toEqual([
      "Τελευταίος έλεγχος",
      "Μοντέλο: Βοηθός",
    ]);
    expect(card.facts[0].value).toContain("απέτυχε (401)");
  });
});

describe("lastOkOf", () => {
  it("should show a dash when there was never a success", () => {
    expect(lastOkOf(connection({ lastSuccessAt: null }))).toBe("—");
  });
});

describe("n5SubRowOf", () => {
  it("should describe the subscription in one line with the amount and currency", () => {
    const row = n5SubRowOf(subscription());
    expect(row.sub).toBe(
      "Φιλοξενία · Πλάνο: Pro · Λογαριασμός: εταιρεία · Πληρώνει: Ιδιοκτήτης · Ανανέωση: 05/11/2026",
    );
    expect(row.amount).toBe("20,00 USD");
    expect(row.link).toBe("https://vercel.com");
  });

  it("should show dashes for empty fields and no link", () => {
    const row = n5SubRowOf(subscription({ plan: "", renewsOn: null, link: "" }));
    expect(row.sub).toContain("Πλάνο: —");
    expect(row.sub).toContain("Ανανέωση: —");
    expect(row.link).toBeNull();
  });
});

describe("n5TotalsOf", () => {
  it("should keep one total per currency", () => {
    expect(
      n5TotalsOf([
        { currency: "EUR", total: 12.5, count: 1 },
        { currency: "USD", total: 40, count: 2 },
      ]),
    ).toEqual([
      { currency: "EUR", amount: "12,50 EUR" },
      { currency: "USD", amount: "40,00 USD" },
    ]);
  });
});
