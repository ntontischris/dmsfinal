// Ο ένας φανταστικός πελάτης που διατρέχει όλο το prototype.
// Μόνο επινοημένα στοιχεία: το repo είναι public. Τα email είναι στο example.com.
// Κάθε module επεκτείνει αυτό το αρχείο με ό,τι χρειάζονται οι οθόνες του.

export interface ClientUser {
  name: string;
  email: string;
  role: "Πλήρης";
  isSignatory: boolean;
}

export interface Period {
  label: string;
  starts: string;
  ends: string;
  state: "κλειστή" | "τρέχουσα" | "επόμενη";
}

export interface AgreementLine {
  description: string;
  monthlyPrice?: number;
  totalPrice?: number;
}

export interface Agreement {
  title: string;
  kind: "μηνιαία" | "εφάπαξ";
  state: "πρόταση" | "υπογεγραμμένη" | "ενεργή" | "έληξε" | "λύθηκε";
  lines: readonly AgreementLine[];
  provisions: readonly string[];
  periods: readonly Period[];
  renewal?: string;
}

export interface FictionalClient {
  name: string;
  legalName: string;
  city: string;
  owner: string;
  users: readonly ClientUser[];
  agreements: readonly Agreement[];
}

export const FICTIONAL_CLIENT: FictionalClient = {
  name: "Κυψέλη Καφέ",
  legalName: "Κυψέλη Καφέ Ο.Ε.",
  city: "Θεσσαλονίκη",
  owner: "Άννα Δημητρίου",
  users: [
    {
      name: "Μαρία Παπαδάκη",
      email: "maria@example.com",
      role: "Πλήρης",
      isSignatory: true,
    },
    {
      name: "Νίκος Σταυρίδης",
      email: "nikos@example.com",
      role: "Πλήρης",
      isSignatory: false,
    },
  ],
  agreements: [
    {
      title: "Μηνιαίο πακέτο social media",
      kind: "μηνιαία",
      state: "ενεργή",
      lines: [
        {
          description: "Πακέτο social: 2 Γυρίσματα και 8 reels τον μήνα",
          monthlyPrice: 900,
        },
      ],
      provisions: ["2 Γυρίσματα", "8 reels"],
      periods: [
        {
          label: "Ιούλιος 2026",
          starts: "2026-07-01",
          ends: "2026-07-31",
          state: "κλειστή",
        },
        {
          label: "Αύγουστος 2026",
          starts: "2026-08-01",
          ends: "2026-08-31",
          state: "κλειστή",
        },
        {
          label: "Σεπτέμβριος 2026",
          starts: "2026-09-01",
          ends: "2026-09-30",
          state: "τρέχουσα",
        },
      ],
      renewal:
        "Λήγει 31/12/2026· νέα Ευκαιρία «ανανέωση» ανοίγει τον Νοέμβριο.",
    },
    {
      title: "Βίντεο εγκαινίων δεύτερου καταστήματος",
      kind: "εφάπαξ",
      state: "πρόταση",
      lines: [
        { description: "Γύρισμα εγκαινίων (μισή μέρα)", totalPrice: 650 },
        { description: "Μοντάζ: ένα βίντεο 90″ και 3 reels", totalPrice: 550 },
      ],
      provisions: ["1 Γύρισμα", "1 βίντεο", "3 reels"],
      periods: [],
    },
  ],
};
