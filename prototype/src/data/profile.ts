// Φανταστικά δεδομένα του Προφίλ (A3): τηλέφωνα και διευθύνσεις ημερολογίου. Repo public: μόνο επινοημένα στοιχεία.
// Πηγές: κεφ. 1 «Πελάτες ως Χρήστες», docs/blueprint/03-processes/04-filming-and-calendar.md «Σύνδεσμος ημερολογίου».

export interface ProfileExtras {
  phone?: string;
  hasGoogle: boolean;
  calendarToken: string;
}

// Ανά Χρήστη ομάδας (id) ή Χρήστη πελάτη (email).
export const PROFILE_EXTRAS: Readonly<Record<string, ProfileExtras>> = {
  giorgos: {
    phone: "+30 690 000 0001",
    hasGoogle: true,
    calendarToken: "k3p9x2",
  },
  dimitris: {
    phone: "+30 690 000 0002",
    hasGoogle: true,
    calendarToken: "m8q1d7",
  },
  aris: {
    phone: "+30 690 000 0003",
    hasGoogle: false,
    calendarToken: "t5w4n6",
  },
  anna: { phone: "+30 690 000 0004", hasGoogle: true, calendarToken: "r2v8b3" },
  eleni: {
    phone: "+30 690 000 0005",
    hasGoogle: false,
    calendarToken: "h7c5y9",
  },
  "maria@example.com": { hasGoogle: false, calendarToken: "c4z6f1" },
  "nikos@example.com": { hasGoogle: true, calendarToken: "n9j2s8" },
};

export const NEW_CALENDAR_TOKEN = "x7u3e5";

export const calendarUrl = (token: string): string =>
  `https://dms.example.com/cal/${token}.ics`;

export type LanguageId = "el" | "en";
export type ThemeId = "dark" | "light" | "device";

export const LANGUAGES: readonly { id: LanguageId; label: string }[] = [
  { id: "el", label: "Ελληνικά" },
  { id: "en", label: "English" },
];

export const THEMES: readonly { id: ThemeId; label: string }[] = [
  { id: "dark", label: "Σκοτεινό (προεπιλογή)" },
  { id: "light", label: "Φωτεινό" },
  { id: "device", label: "Όπως η συσκευή" },
];

// Τι περιέχει το ημερολόγιο: διαφέρει για ομάδα και πελάτη.
export const CALENDAR_CONTENT = {
  team: "Τα Γυρίσματα στα οποία είσαι στο Συνεργείο, ο Κλεισμένος χρόνος σου και οι προθεσμίες σου.",
  client: "Μόνο τα Γυρίσματα του Πελάτη σου.",
} as const;

// Μετρητές ανά Πελάτη στην εναλλαγή Πελάτη (A4).
export interface ClientCounters {
  unread: number;
  versionsToApprove: number;
  openInvoices: number;
}

export const CLIENT_COUNTERS: Readonly<Record<string, ClientCounters>> = {
  kypseli: { unread: 2, versionsToApprove: 1, openInvoices: 1 },
  armyra: { unread: 0, versionsToApprove: 0, openInvoices: 2 },
};

export const NIKOS_EMAIL = "nikos@example.com";
