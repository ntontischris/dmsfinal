// Οι φανταστικές Ευκαιρίες του module «1 Πελάτες και Πωλήσεις» (και οι προτάσεις τους).

import { FICTIONAL_CLIENT } from "@/data/fictional-client";
import { KYPSELI_ID } from "@/data/sales";

// Τα Στάδια τα ορίζει ο admin (Ρυθμίσεις). Αρχικές τιμές: εκκρεμεί (sales #1).
export const STAGES = ["Πρώτη επαφή", "Πρόταση", "Διαπραγμάτευση"] as const;
export const LOSS_REASONS = ["Τιμή", "Δεν απάντησε", "Πήγε αλλού"] as const;
export const SOURCES = [
  "Ιστοσελίδα",
  "Instagram",
  "Σύσταση",
  "Ανανέωση",
] as const;

export type Outcome = "Ανοιχτή" | "Κερδισμένη" | "Χαμένη";
export type ProposalPath =
  "Σύνταξη" | "Αναμένει Έγκριση" | "Εστάλη" | "Έληξε" | "Υπογράφηκε";
export type LinkState = "ενεργός" | "ακυρώθηκε" | "έληξε" | "ανακλήθηκε";

export interface ProposalLine {
  description: string;
  catalogPrice: number | null;
  price: number;
  estimatedCost: number;
}

export interface Recipient {
  name: string;
  isSignatory: boolean;
  link: LinkState;
  opened: boolean;
}

export interface Proposal {
  title: string;
  kind: "μηνιαία" | "εφάπαξ";
  path: ProposalPath;
  revision: number;
  validUntil: string;
  lines: readonly ProposalLine[];
  deviations: readonly string[];
  approval?: {
    state: "αναμένει" | "εγκρίθηκε" | "απορρίφθηκε";
    comment?: string;
  };
  lowMargin: boolean;
  recipients: readonly Recipient[];
}

export interface OpportunityActivity {
  when: string;
  kind: string;
  text: string;
  by: string;
}

export interface Opportunity {
  id: string;
  clientId: string;
  title: string;
  stage: string;
  outcome: Outcome;
  lostReason?: string;
  ownerId: string | null;
  source: string;
  referredBy?: string;
  nextStep?: { text: string; due: string };
  activities: readonly OpportunityActivity[];
  proposal?: Proposal;
}

const launchVideo = FICTIONAL_CLIENT.agreements[1];

export const OPPORTUNITIES: readonly Opportunity[] = [
  {
    id: "o-renewal",
    clientId: KYPSELI_ID,
    title: "Ανανέωση μηνιαίου πακέτου social",
    stage: "Πρώτη επαφή",
    outcome: "Ανοιχτή",
    ownerId: "anna",
    source: "Ανανέωση",
    nextStep: {
      text: "Κλήση για ανανέωση (η Συμφωνία λήγει 31/12)",
      due: "2026-10-20",
    },
    activities: [
      {
        when: "2026-09-19",
        kind: "σύστημα",
        text: "Ανοίχτηκε Ευκαιρία «ανανέωση».",
        by: "Σύστημα",
      },
    ],
  },
  {
    id: "o-launch",
    clientId: KYPSELI_ID,
    title: launchVideo.title,
    stage: "Πρόταση",
    outcome: "Ανοιχτή",
    ownerId: "anna",
    source: "Σύσταση",
    referredBy: "Καφέ Αθηνά",
    nextStep: { text: "Να ρωτήσω αν είδε την πρόταση", due: "2026-09-24" },
    activities: [
      {
        when: "2026-09-19",
        kind: "σύστημα",
        text: "Ο πελάτης άνοιξε τον Σύνδεσμο πρότασης.",
        by: "Σύστημα",
      },
      {
        when: "2026-09-18",
        kind: "email",
        text: "Στάλθηκε η πρόταση στη Μαρία Παπαδάκη και τον Νίκο Σταυρίδη.",
        by: "Άννα Δημητρίου",
      },
      {
        when: "2026-09-17",
        kind: "κλήση",
        text: "Κλήση: θέλει βίντεο 90″ και 3 reels για τα εγκαίνια.",
        by: "Άννα Δημητρίου",
      },
    ],
    proposal: {
      title: launchVideo.title,
      kind: "εφάπαξ",
      path: "Εστάλη",
      revision: 1,
      validUntil: "2026-10-02",
      lines: [
        {
          description: launchVideo.lines[0].description,
          catalogPrice: 650,
          price: 650,
          estimatedCost: 380,
        },
        {
          description: launchVideo.lines[1].description,
          catalogPrice: 550,
          price: 550,
          estimatedCost: 300,
        },
      ],
      deviations: [],
      lowMargin: false,
      recipients: [
        {
          name: "Μαρία Παπαδάκη",
          isSignatory: true,
          link: "ενεργός",
          opened: true,
        },
        {
          name: "Νίκος Σταυρίδης",
          isSignatory: false,
          link: "ενεργός",
          opened: false,
        },
      ],
    },
  },
  {
    id: "o-kinisi",
    clientId: "kinisi",
    title: "Πακέτο social με 4 έξτρα reels",
    stage: "Διαπραγμάτευση",
    outcome: "Ανοιχτή",
    ownerId: "anna",
    source: "Instagram",
    nextStep: { text: "Αναμονή Έγκρισης, μετά αποστολή", due: "2026-09-22" },
    activities: [
      {
        when: "2026-09-19",
        kind: "σύστημα",
        text: "Ζητήθηκε Έγκριση πρότασης (Παρέκκλιση).",
        by: "Άννα Δημητρίου",
      },
      {
        when: "2026-09-15",
        kind: "συνάντηση",
        text: "Θέλει έκπτωση 25% για να κλείσει.",
        by: "Άννα Δημητρίου",
      },
    ],
    proposal: {
      title: "Πακέτο social με 4 έξτρα reels",
      kind: "μηνιαία",
      path: "Αναμένει Έγκριση",
      revision: 2,
      validUntil: "2026-10-10",
      lines: [
        {
          description:
            "Πακέτο social: 2 Γυρίσματα και 8 reels τον μήνα (έκπτωση 25%)",
          catalogPrice: 900,
          price: 675,
          estimatedCost: 560,
        },
        {
          description: "4 επιπλέον reels τον μήνα (ελεύθερη γραμμή)",
          catalogPrice: null,
          price: 150,
          estimatedCost: 140,
        },
      ],
      deviations: [
        "Έκπτωση 25%, πέρα από την τυπική 10% πρώτων μηνών",
        "Ελεύθερη γραμμή",
        "Περισσότερες Παροχές από το Πακέτο",
      ],
      approval: { state: "αναμένει" },
      lowMargin: true,
      recipients: [
        {
          name: "Σταύρος Μπαλτάς",
          isSignatory: true,
          link: "ακυρώθηκε",
          opened: false,
        },
      ],
    },
  },
  {
    id: "o-meli",
    clientId: "meli",
    title: "Πακέτο podcast",
    stage: "Πρόταση",
    outcome: "Ανοιχτή",
    ownerId: "anna",
    source: "Instagram",
    nextStep: { text: "Παράταση ή κλείσιμο", due: "2026-09-12" },
    activities: [
      {
        when: "2026-09-12",
        kind: "σύστημα",
        text: "Έληξε η πρόταση. Η Ευκαιρία μένει ανοιχτή.",
        by: "Σύστημα",
      },
      {
        when: "2026-09-09",
        kind: "email",
        text: "Η κ. Ράπτη ζήτησε αλλαγές σε έναν όρο.",
        by: "Ελένη Ράπτη",
      },
    ],
    proposal: {
      title: "Πακέτο podcast",
      kind: "μηνιαία",
      path: "Έληξε",
      revision: 2,
      validUntil: "2026-09-12",
      lines: [
        {
          description: "Πακέτο podcast: 2 επεισόδια τον μήνα",
          catalogPrice: 700,
          price: 700,
          estimatedCost: 430,
        },
      ],
      deviations: [],
      lowMargin: false,
      recipients: [
        { name: "Ελένη Ράπτη", isSignatory: true, link: "έληξε", opened: true },
      ],
    },
  },
  {
    id: "o-armyra",
    clientId: "armyra",
    title: "Νέο βίντεο εστιατορίου",
    stage: "Πρώτη επαφή",
    outcome: "Ανοιχτή",
    ownerId: "anna",
    source: "Σύσταση",
    referredBy: FICTIONAL_CLIENT.name,
    nextStep: { text: "Ραντεβού στο μαγαζί", due: "2026-09-26" },
    activities: [
      {
        when: "2026-09-10",
        kind: "κλήση",
        text: "Πρώτη κλήση, ενδιαφέρεται για νέο βίντεο.",
        by: "Άννα Δημητρίου",
      },
    ],
  },
  {
    id: "o-athina",
    clientId: "athina",
    title: "Πακέτο social: 2 Γυρίσματα και 8 reels",
    stage: "Διαπραγμάτευση",
    outcome: "Κερδισμένη",
    ownerId: "nikos",
    source: "Ιστοσελίδα",
    activities: [
      {
        when: "2026-08-28",
        kind: "σύστημα",
        text: "Υπέγραψε ο Υπογράφων. Η Ευκαιρία έγινε κερδισμένη.",
        by: "Σύστημα",
      },
      {
        when: "2026-08-21",
        kind: "email",
        text: "Στάλθηκε η πρόταση.",
        by: "Νίκος Βασιλείου",
      },
    ],
    proposal: {
      title: "Πακέτο social: 2 Γυρίσματα και 8 reels",
      kind: "μηνιαία",
      path: "Υπογράφηκε",
      revision: 1,
      validUntil: "2026-09-04",
      lines: [
        {
          description: "Πακέτο social: 2 Γυρίσματα και 8 reels τον μήνα",
          catalogPrice: 900,
          price: 900,
          estimatedCost: 560,
        },
      ],
      deviations: [],
      lowMargin: false,
      recipients: [
        {
          name: "Μαρία Σιμιτζή",
          isSignatory: true,
          link: "ενεργός",
          opened: true,
        },
      ],
    },
  },
  {
    id: "o-armyra-lost",
    clientId: "armyra",
    title: "Φωτογράφιση μενού",
    stage: "Πρόταση",
    outcome: "Χαμένη",
    lostReason: "Τιμή",
    ownerId: "nikos",
    source: "Ιστοσελίδα",
    activities: [
      {
        when: "2026-07-30",
        kind: "σημείωση",
        text: "Έκλεισε ως χαμένη: βρήκε φθηνότερο.",
        by: "Νίκος Βασιλείου",
      },
    ],
  },
  {
    id: "o-athinaion",
    clientId: "athinaion",
    title: "Πακέτο social (φόρμα Ιστοσελίδας)",
    stage: "Πρώτη επαφή",
    outcome: "Ανοιχτή",
    ownerId: null,
    source: "Ιστοσελίδα",
    activities: [
      {
        when: "2026-09-19",
        kind: "σύστημα",
        text: "Φόρμα ενδιαφέροντος: «2 Γυρίσματα και 8 reels τον μήνα».",
        by: "Σύστημα",
      },
    ],
  },
  {
    id: "o-hamogelo",
    clientId: "hamogelo",
    title: "Βίντεο γνωριμίας ιατρείου (φόρμα Ιστοσελίδας)",
    stage: "Πρώτη επαφή",
    outcome: "Ανοιχτή",
    ownerId: null,
    source: "Ιστοσελίδα",
    activities: [
      {
        when: "2026-09-20",
        kind: "σύστημα",
        text: "Φόρμα ενδιαφέροντος: «Βίντεο εταιρικής παρουσίασης».",
        by: "Σύστημα",
      },
    ],
  },
];

export const findOpportunity = (
  id: string | undefined,
): Opportunity | undefined =>
  OPPORTUNITIES.find((opportunity) => opportunity.id === id);
