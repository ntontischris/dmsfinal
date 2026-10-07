// Ρυθμίσεις › Εταιρεία (O1): φανταστικά στοιχεία εταιρείας. Μόνο για το prototype.

export interface CompanyProfile {
  name: string;
  tradeName: string;
  address: string;
  phone: string;
  email: string;
  replyEmail: string; // προεπιλογή: το email της εταιρείας
  logo: string;
  signerName: string;
  signerTitle: string;
}

export interface TaxIdentity {
  afm: string;
  doy: string;
  gemi: string;
}

export interface BankAccount {
  id: string;
  bank: string;
  iban: string;
  isDefault: boolean;
}

export interface AssistantSettings {
  conversationLimit: number; // μηνύματα ανά Συζήτηση
  dailyAddressLimit: number; // μηνύματα ανά διεύθυνση τη μέρα
  monthlyCap: number; // πλαφόν σε $
  monthlyUsed: number; // τρέχουσα χρήση σε $
  widgetShare: number; // 0..1
}

export const COMPANY: CompanyProfile = {
  name: "Δέλτα Παραγωγές Ι.Κ.Ε.",
  tradeName: "Delta Films",
  address: "Λεωφ. Αλεξάνδρας 120, 11472 Αθήνα",
  phone: "210 555 0142",
  email: "info@deltafilms.example",
  replyEmail: "info@deltafilms.example",
  logo: "delta-films-logo.svg",
  signerName: "Γιώργος Μαυρίδης",
  signerTitle: "Διαχειριστής",
};

export const TAX: TaxIdentity = {
  afm: "099999990",
  doy: "ΔΟΥ Αμπελοκήπων",
  gemi: "123456789000",
};

export const BANK_ACCOUNTS: readonly BankAccount[] = [
  {
    id: "main",
    bank: "Τράπεζα Αιγαίου",
    iban: "GR16 0110 1250 0000 0001 2300 695",
    isDefault: true,
  },
  {
    id: "second",
    bank: "Εθνική Δοκιμής",
    iban: "GR97 0140 1010 1010 0210 2345 678",
    isDefault: false,
  },
];

export const VAT_RATE = 0.24;

export const ASSISTANT: AssistantSettings = {
  conversationLimit: 15,
  dailyAddressLimit: 40,
  monthlyCap: 30,
  monthlyUsed: 11.4,
  widgetShare: 0.8,
};

// Πόσα στοιχεία επηρεάζει η αλλαγή της αντίστοιχης προεπιλογής.
export const OPEN_PROPOSALS_FOR_SIGNER = 3;
export const IBAN_CHANGE_PREVIEW = {
  from: BANK_ACCOUNTS[0].iban,
  to: "GR33 0110 1250 0000 0001 2300 777",
} as const;
