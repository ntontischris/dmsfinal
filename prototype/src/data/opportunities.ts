// Οι φανταστικές Ευκαιρίες του module «1 Πελάτες και Πωλήσεις» (και οι προτάσεις τους).

import { FICTIONAL_CLIENT } from "@/data/fictional-client";
import { KYPSELI_ID } from "@/data/sales";

// Αρχικές τιμές των λιστών (Ρυθμίσεις › Πωλήσεις, Blueprint κεφ. 5): τις αλλάζει ο admin. Ένα σημείο ορισμού: το settings-sales.ts τις διαβάζει από εδώ.
export const STAGES = [
  "Νέα",
  "Πρώτη επαφή",
  "Συνάντηση",
  "Πρόταση",
  "Διαπραγμάτευση",
] as const;
export const LOSS_REASONS = [
  "Τιμή",
  "Δεν απάντησε",
  "Επέλεξε άλλον",
  "Όχι τώρα",
  "Εκτός αντικειμένου",
] as const;
export const SOURCES = [
  "Ιστοσελίδα",
  "Instagram",
  "Facebook",
  "Σύσταση",
  "Τηλέφωνο",
  "Άλλο",
] as const;
export const ACTIVITY_KINDS = ["Κλήση", "Email", "Συνάντηση", "Σημείωση"] as const;

export type Outcome = "Ανοιχτή" | "Κερδισμένη" | "Χαμένη";
export type ProposalPath =
  "Σύνταξη" | "Αναμένει Έγκριση" | "Εστάλη" | "Έληξε" | "Υπογράφηκε";
export type LinkState = "ενεργός" | "ακυρώθηκε" | "έληξε" | "ανακλήθηκε";

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
  // Ανανέωση: η Συμφωνία που ανανεώνει. Η νέα πρόταση ξεκινά από τις τρέχουσες τιμές του Καταλόγου.
  renewsAgreementId?: string;
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
    source: "Τηλέφωνο",
    renewsAgreementId: "ag-kypseli-social",
    nextStep: {
      text: "Κλήση για ανανέωση (η Συμφωνία λήγει 31/12)",
      due: "2026-10-20",
    },
    activities: [
      {
        when: "2026-09-19",
        kind: "Σημείωση",
        text: "Ανοίχτηκε με το χέρι για ανανέωση, νωρίτερα από την αυτόματη Ευκαιρία της 01/12. Η πρόταση ξεκινά από τις τρέχουσες τιμές του Καταλόγου (1.300 €).",
        by: "Άννα Δημητρίου",
      },
    ],
  },
  {
    id: "o-kypseli-social",
    clientId: KYPSELI_ID,
    title: "Μηνιαίο πακέτο social media",
    stage: "Διαπραγμάτευση",
    outcome: "Κερδισμένη",
    ownerId: "anna",
    source: "Ιστοσελίδα",
    activities: [
      {
        when: "2026-06-24",
        kind: "σύστημα",
        text: "Υπέγραψε ο Υπογράφων. Η Ευκαιρία έγινε κερδισμένη.",
        by: "Σύστημα",
      },
      {
        when: "2026-06-18",
        kind: "Email",
        text: "Στάλθηκε η πρόταση στη Μαρία Παπαδάκη, με τιμή 900 € (έκπτωση πρώτου πελάτη, εγκεκριμένη από τον Ιδιοκτήτη).",
        by: "Άννα Δημητρίου",
      },
      {
        when: "2026-06-05",
        kind: "σύστημα",
        text: "Φόρμα ενδιαφέροντος: «2 Γυρίσματα και 8 reels τον μήνα».",
        by: "Σύστημα",
      },
    ],
    proposal: {
      title: "Μηνιαίο πακέτο social media",
      kind: "μηνιαία",
      path: "Υπογράφηκε",
      revision: 1,
      validUntil: "2026-07-02",
      recipients: [
        {
          name: "Μαρία Παπαδάκη",
          isSignatory: true,
          link: "έληξε",
          opened: true,
        },
      ],
    },
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
        kind: "Email",
        text: "Στάλθηκε η πρόταση στη Μαρία Παπαδάκη και τον Νίκο Σταυρίδη.",
        by: "Άννα Δημητρίου",
      },
      {
        when: "2026-09-17",
        kind: "Κλήση",
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
    title: "4 έξτρα reels τον μήνα",
    stage: "Διαπραγμάτευση",
    outcome: "Ανοιχτή",
    ownerId: "anna",
    source: "Instagram",
    nextStep: { text: "Αναμονή Έγκρισης, μετά αποστολή", due: "2026-09-22" },
    activities: [
      {
        when: "2026-09-16",
        kind: "σύστημα",
        text: "Ζητήθηκε Έγκριση πρότασης (Παρέκκλιση).",
        by: "Άννα Δημητρίου",
      },
      {
        when: "2026-09-11",
        kind: "Συνάντηση",
        text: "Θέλει έκπτωση 25% για να κλείσει.",
        by: "Άννα Δημητρίου",
      },
    ],
    proposal: {
      title: "4 έξτρα reels τον μήνα",
      kind: "μηνιαία",
      path: "Αναμένει Έγκριση",
      revision: 2,
      validUntil: "2026-10-10",
      recipients: [
        {
          name: "Σταύρος Μπαλτάς",
          isSignatory: true,
          link: "ακυρώθηκε",
          opened: true,
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
        when: "2026-08-29",
        kind: "Email",
        text: "Η κ. Ράπτη ζήτησε αλλαγές σε έναν όρο (μέρες πληρωμής 30). Στάλθηκε η αναθεωρημένη πρόταση.",
        by: "Άννα Δημητρίου",
      },
    ],
    proposal: {
      title: "Πακέτο podcast",
      kind: "μηνιαία",
      path: "Έληξε",
      revision: 2,
      validUntil: "2026-09-12",
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
        kind: "Κλήση",
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
        when: "2026-08-27",
        kind: "Σημείωση",
        text: "Καταχωρίστηκε υπογραφή εκτός συστήματος. Η Ευκαιρία έγινε κερδισμένη.",
        by: "Νίκος Βασιλείου",
      },
      {
        when: "2026-08-21",
        kind: "Email",
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
      recipients: [
        {
          name: "Μαρία Σιμιτζή",
          isSignatory: true,
          link: "έληξε",
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
        kind: "Σημείωση",
        text: "Έκλεισε ως χαμένη: βρήκε φθηνότερο.",
        by: "Νίκος Βασιλείου",
      },
    ],
  },
  {
    id: "o-athinaion",
    clientId: "athinaion",
    title: "Πακέτο social (φόρμα Ιστοσελίδας)",
    stage: "Νέα",
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
    stage: "Νέα",
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
