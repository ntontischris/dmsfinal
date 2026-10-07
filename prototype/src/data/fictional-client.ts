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
  proposalPath?: "Σύνταξη" | "Αναμένει Έγκριση" | "Εστάλη" | "Έληξε" | "Χάθηκε";
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
          description: "Μηνιαία Παρουσία: 2 Γυρίσματα και 8 reels τον μήνα",
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
        {
          label: "Οκτώβριος 2026",
          starts: "2026-10-01",
          ends: "2026-10-31",
          state: "επόμενη",
        },
      ],
      renewal:
        "Λήγει 31/12/2026· η Ευκαιρία «ανανέωση» ανοίχτηκε με το χέρι στις 19/09 (αλλιώς θα άνοιγε αυτόματα την 01/12).",
    },
    {
      title: "Βίντεο εγκαινίων δεύτερου καταστήματος",
      kind: "εφάπαξ",
      state: "πρόταση",
      proposalPath: "Εστάλη",
      lines: [
        {
          description:
            "Εκδήλωση Μίνι: Γύρισμα εγκαινίων (μισή μέρα) και βίντεο 90″",
          totalPrice: 840,
        },
        { description: "Έξτρα reel (3 τεμάχια)", totalPrice: 360 },
      ],
      provisions: ["1 Γύρισμα", "1 βίντεο", "3 reels"],
      periods: [],
    },
  ],
};
