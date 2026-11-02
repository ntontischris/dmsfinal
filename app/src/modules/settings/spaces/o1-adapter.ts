// O1 (νέα εμφάνιση): οι πραγματικές Ρυθμίσεις › Εταιρεία στις μορφές των καρτών του prototype. Καθαρές συναρτήσεις.

import type {
  AiSpend,
  BankAccount,
  CompanySettings,
  SettingsChange,
} from "../queries";
import { formatIban } from "../validation";

// Πεδία χωρίς προεπιλογή που μετρούν στον Έλεγχο ετοιμότητας: κενά = «εκκρεμεί» (όπως το «Πρώτο στήσιμο» του prototype).
const REQUIRED_FIELDS = [
  "legal_name",
  "address",
  "phone",
  "email",
  "signatory_name",
  "signatory_title",
  "tax_id",
  "tax_office",
  "gemi",
] as const;

export type RequiredField = (typeof REQUIRED_FIELDS)[number];

export const pendingFieldsOf = (
  company: CompanySettings,
): ReadonlySet<RequiredField> =>
  new Set(REQUIRED_FIELDS.filter((field) => company[field].trim() === ""));

// Πρώτο στήσιμο: δεν έχει γραφτεί ούτε η Επωνυμία.
export const isFirstSetup = (company: CompanySettings): boolean =>
  company.legal_name.trim() === "";

export const FIELD_LABELS: Readonly<Record<string, string>> = {
  legal_name: "Επωνυμία",
  trade_name: "Διακριτικός τίτλος",
  address: "Διεύθυνση",
  phone: "Τηλέφωνο",
  email: "Email",
  reply_to_email: "Email απαντήσεων",
  signatory_name: "Υπογράφων",
  signatory_title: "Ιδιότητα Υπογράφοντος",
  tax_id: "ΑΦΜ",
  tax_office: "ΔΟΥ",
  gemi: "ΓΕΜΗ",
  vat_rate: "ΦΠΑ",
  ai_monthly_cap_usd: "Πλαφόν AI",
  ai_widget_share: "Μερίδιο widget",
  widget_messages_per_conversation: "Όριο ανά Συζήτηση",
  widget_messages_per_ip_day: "Όριο ανά μέρα",
  iban: "IBAN",
  is_default: "Προεπιλεγμένος λογαριασμός",
  retired_at: "Απόσυρση λογαριασμού",
  bank_name: "Τράπεζα",
  holder: "Δικαιούχος",
};

const ENTITY_LABELS: Readonly<Record<string, string>> = {
  company_settings: "Στοιχεία εταιρείας",
  bank_accounts: "Λογαριασμοί τραπέζης",
};

export interface O1Change {
  id: string;
  at: string;
  actor: string;
  subject: string;
  fields: string;
}

const AT = new Intl.DateTimeFormat("el-GR", {
  timeZone: "Europe/Athens",
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
  hour12: false,
});

export const fmtAt = (iso: string): string =>
  AT.format(new Date(iso)).replace(",", "");

export const o1ChangesOf = (
  changes: readonly SettingsChange[],
): readonly O1Change[] =>
  changes.map((change, index) => ({
    id: `${change.at}-${change.entity}-${index}`,
    at: fmtAt(change.at),
    actor: change.actorName,
    subject: ENTITY_LABELS[change.entity] ?? change.entity,
    fields:
      change.fields.map((field) => FIELD_LABELS[field] ?? field).join(", ") ||
      "άλλαξε",
  }));

const usd = (micros: number): string => `$${(micros / 1_000_000).toFixed(2)}`;

// «Τρέχουσα χρήση: $3.20 από $20.» · null όταν δεν φόρτωσε η δαπάνη (δεν δείχνουμε μηδέν).
export const spendLineOf = (spend: AiSpend | null): string | null =>
  spend
    ? `Τρέχουσα χρήση: ${usd(spend.spentMicros)} από ${usd(spend.capMicros)}.`
    : null;

export interface O1BankRow {
  id: string;
  bank: string;
  iban: string;
  holder: string;
  isDefault: boolean;
}

export interface O1Banks {
  rows: readonly O1BankRow[];
  retired: number;
}

export const banksOf = (accounts: readonly BankAccount[]): O1Banks => {
  const active = accounts.filter((account) => !account.retired_at);
  return {
    rows: active.map((account) => ({
      id: account.id,
      bank: account.bank_name,
      iban: formatIban(account.iban),
      holder: account.holder,
      isDefault: account.is_default,
    })),
    retired: accounts.length - active.length,
  };
};
