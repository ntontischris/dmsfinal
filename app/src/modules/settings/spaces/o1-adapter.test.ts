import { describe, expect, it } from "vitest";

import type { BankAccount, CompanySettings, SettingsChange } from "../queries";
import {
  banksOf,
  isFirstSetup,
  o1ChangesOf,
  pendingFieldsOf,
  spendLineOf,
} from "./o1-adapter";

const company = (overrides: Partial<CompanySettings> = {}): CompanySettings => ({
  legal_name: "Devre Media ΙΚΕ",
  trade_name: "Devre",
  address: "Οδός 1, Θεσσαλονίκη",
  phone: "2310000000",
  email: "info@example.com",
  reply_to_email: "",
  signatory_name: "Άννα Δημητρίου",
  signatory_title: "Διαχειρίστρια",
  tax_id: "123456789",
  tax_office: "Α' Θεσσαλονίκης",
  gemi: "123456789000",
  vat_rate: 24,
  ai_monthly_cap_usd: 20,
  ai_widget_share: 30,
  widget_messages_per_conversation: 20,
  widget_messages_per_ip_day: 50,
  updated_at: "2026-10-01T10:00:00Z",
  ...overrides,
});

const account = (overrides: Partial<BankAccount> = {}): BankAccount => ({
  id: "b-1",
  bank_name: "Τράπεζα Πειραιώς",
  holder: "Devre Media ΙΚΕ",
  iban: "GR1601101250000000012300695",
  is_default: true,
  retired_at: null,
  ...overrides,
});

describe("pendingFieldsOf", () => {
  it("should mark empty fields without a default as pending", () => {
    const pending = pendingFieldsOf(company({ address: " ", tax_id: "" }));
    expect([...pending].sort()).toEqual(["address", "tax_id"]);
  });

  it("should not mark optional fields (trade name, reply email) as pending", () => {
    expect(pendingFieldsOf(company({ trade_name: "", reply_to_email: "" })).size).toBe(0);
  });
});

describe("isFirstSetup", () => {
  it("should be first setup only while the legal name is empty", () => {
    expect(isFirstSetup(company({ legal_name: "" }))).toBe(true);
    expect(isFirstSetup(company())).toBe(false);
  });
});

describe("o1ChangesOf", () => {
  const change = (overrides: Partial<SettingsChange> = {}): SettingsChange => ({
    at: "2026-10-05T09:30:00Z",
    entity: "company_settings",
    actorName: "Άννα",
    fields: ["tax_id", "vat_rate"],
    ...overrides,
  });

  it("should label the entity and the changed fields in Greek", () => {
    const [row] = o1ChangesOf([change()]);
    expect(row.actor).toBe("Άννα");
    expect(row.subject).toBe("Στοιχεία εταιρείας");
    expect(row.fields).toBe("ΑΦΜ, ΦΠΑ");
    expect(row.at).toBe("05/10/2026 12:30");
  });

  it("should say «άλλαξε» when no field is listed", () => {
    expect(o1ChangesOf([change({ entity: "bank_accounts", fields: [] })])[0]).toMatchObject({
      subject: "Λογαριασμοί τραπέζης",
      fields: "άλλαξε",
    });
  });
});

describe("spendLineOf", () => {
  it("should show spend against the cap in dollars", () => {
    expect(spendLineOf({ month: "2026-10", spentMicros: 3_200_000, capMicros: 20_000_000 })).toBe(
      "Τρέχουσα χρήση: $3.20 από $20.00.",
    );
  });

  it("should return null when the spend did not load", () => {
    expect(spendLineOf(null)).toBeNull();
  });
});

describe("banksOf", () => {
  it("should list active accounts with a formatted IBAN and count retired ones", () => {
    const banks = banksOf([
      account(),
      account({ id: "b-2", is_default: false, retired_at: "2026-09-01T00:00:00Z" }),
    ]);
    expect(banks.retired).toBe(1);
    expect(banks.rows).toHaveLength(1);
    expect(banks.rows[0]).toMatchObject({ id: "b-1", isDefault: true });
    expect(banks.rows[0].iban).toContain(" ");
  });
});
