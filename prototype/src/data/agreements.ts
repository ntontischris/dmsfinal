// Φανταστικά δεδομένα του module «3 Συμφωνίες»: Συμφωνίες με γραμμές, Όρους, Περιόδους, αναθεωρήσεις και υπογραφή.
// Repo public: μόνο επινοημένα ονόματα και νούμερα. Οι τιμές είναι χωρίς ΦΠΑ.
// Πηγές: κεφ. 3.1 (κύκλος ζωής), 3.2 (πρόταση, Παρέκκλιση, Σύνδεσμος), 3.3 (γραμμές, Όροι, κόστος), ADR 0008, 0009, 0017.

import {
  COST_SETTINGS,
  hourCost,
  provisionKind,
  type EstimatedHours,
  type Provision,
  type ProvisionKindId,
} from "@/data/catalogue";
import type { LinkState } from "@/data/opportunities";

export type AgreementKind = "μηνιαία" | "εφάπαξ";
export type AgreementState =
  "πρόταση" | "υπογεγραμμένη" | "ενεργή" | "έληξε" | "λύθηκε";
export type ProposalPath =
  "Σύνταξη" | "Αναμένει Έγκριση" | "Εστάλη" | "Έληξε" | "Υπογράφηκε" | "Χάθηκε";
export type UnusedProvisions = "χάνονται" | "επόμενη Περίοδο" | "μαζεύονται";
export type Renewal = "νέα Ευκαιρία" | "αυτόματη συνέχιση";
export type MilestoneTrigger =
  "υπογραφή" | "ημερομηνία" | "Γύρισμα έγινε" | "Παραγωγή παραδόθηκε";

export interface Milestone {
  trigger: MilestoneTrigger;
  percent: number;
  date?: string;
}

// Οι Όροι αντιγράφονται από τις προεπιλογές (Ρυθμίσεις › Συμφωνίες, O3) και αλλάζουν ελεύθερα όσο η Συμφωνία είναι πρόταση.
export interface Terms {
  paymentDays: number;
  unusedProvisions: UnusedProvisions;
  graceDays: number;
  durationMonths: number | null;
  renewal: Renewal | null;
  dissolution: { noticeDays: number; fee: number };
  filming: {
    noticeDays: number;
    cancelHours: number;
    lateCancelBurns: boolean;
    noShowBurns: boolean;
  };
  revisionLimit: Partial<Record<ProvisionKindId, number>>;
  milestones: readonly Milestone[];
  firstMonthsDiscount: { percent: number; months: number };
}

// Ελάχιστη προειδοποίηση κράτησης 48 ώρες = 2 μέρες (Blueprint). Το όριο ακύρωσης 48→24 ώρες ισχύει μόνο για νέες προτάσεις (ADR 0015).
const NEW_FILMING: Terms["filming"] = {
  noticeDays: 2,
  cancelHours: 24,
  lateCancelBurns: true,
  noShowBurns: true,
};

export const DEFAULT_TERMS: Readonly<Record<AgreementKind, Terms>> = {
  μηνιαία: {
    paymentDays: 15,
    unusedProvisions: "επόμενη Περίοδο",
    graceDays: 10,
    durationMonths: 6,
    renewal: "νέα Ευκαιρία",
    dissolution: { noticeDays: 30, fee: 0 },
    filming: NEW_FILMING,
    revisionLimit: { reel: 2, video: 2, photo: 1, episode: 1 },
    milestones: [],
    firstMonthsDiscount: { percent: 0, months: 0 },
  },
  εφάπαξ: {
    paymentDays: 15,
    unusedProvisions: "χάνονται",
    graceDays: 0,
    durationMonths: null,
    renewal: null,
    dissolution: { noticeDays: 0, fee: 0 },
    filming: NEW_FILMING,
    revisionLimit: { reel: 2, video: 2, photo: 1, episode: 1 },
    milestones: [
      { trigger: "υπογραφή", percent: 50 },
      { trigger: "Παραγωγή παραδόθηκε", percent: 50 },
    ],
    firstMonthsDiscount: { percent: 0, months: 0 },
  },
};

// Ρυθμίσεις › Συμφωνίες: η τυπική έκπτωση πρώτων μηνών (ό,τι την ξεπερνά είναι Παρέκκλιση) και η Ισχύς πρότασης.
export const STANDARD_DISCOUNT = { percent: 10, months: 2 } as const;
// Ισχύς πρότασης 14→21 μέρες: μόνο για νέες προτάσεις· οι υπάρχουσες κρατούν τη δική τους ημερομηνία λήξης.
export const PROPOSAL_VALIDITY_DAYS = 21;

// Μία γραμμή: Πακέτο ή Υπηρεσία του Καταλόγου (itemId) ή ελεύθερη γραμμή (itemId null).
// Τιμή, Παροχές και ώρες είναι ανά Περίοδο στη μηνιαία, συνολικά στην εφάπαξ, και για όλη την ποσότητα.
// catalogPrice / catalogProvisions: η εικόνα του Καταλόγου τη στιγμή που φτιάχτηκε η πρόταση.
export interface AgreementLine {
  id: string;
  itemId: string | null;
  description: string;
  quantity: number;
  unitPrice: number;
  catalogPrice: number | null;
  provisions: readonly Provision[];
  catalogProvisions: readonly Provision[] | null;
  hours: EstimatedHours;
  directCost: number;
}

export interface Recipient {
  name: string;
  email: string;
  isSignatory: boolean;
  link: LinkState;
  opened: boolean;
}

export interface Revision {
  number: number;
  when: string;
  by: string;
  summary: string;
  approval?: {
    state: "αναμένει" | "εγκρίθηκε" | "απορρίφθηκε";
    by?: string;
    when?: string;
    comment?: string;
    approvedDeviations?: readonly Deviation[];
  };
}

export interface PeriodProvision {
  kindId: ProvisionKindId;
  given: number;
  carried: number;
  used: number;
}

export interface AgreementPeriod {
  label: string;
  starts: string;
  ends: string;
  state: "κλειστή" | "τρέχουσα" | "επόμενη";
  provisions: readonly PeriodProvision[];
}

export interface Signature {
  by: string;
  when: string;
  method: "Σύνδεσμος πρότασης" | "εκτός συστήματος";
  file?: string;
}

export interface Dissolution {
  when: string;
  reason: string;
  by: string;
  fee: number;
}

export interface AgreementRecord {
  id: string;
  clientId: string;
  opportunityId: string | null;
  ownerId: string;
  title: string;
  kind: AgreementKind;
  state: AgreementState;
  path: ProposalPath | null;
  language: "el" | "en";
  lines: readonly AgreementLine[];
  terms: Terms;
  start: string | null;
  end: string | null;
  validUntil: string | null;
  recipients: readonly Recipient[];
  revisions: readonly Revision[];
  periods: readonly AgreementPeriod[];
  signature?: Signature;
  dissolution?: Dissolution;
  renewedBy?: string;
}

const SOCIAL_PROVISIONS: readonly Provision[] = [
  { kindId: "shoot", quantity: 2 },
  { kindId: "reel", quantity: 8 },
];

// Οι υπάρχουσες Συμφωνίες κρατούν το όριο ακύρωσης 48 ωρών της εποχής τους.
const LEGACY_FILMING: Terms["filming"] = { ...NEW_FILMING, cancelHours: 48 };
const monthlyTerms: Terms = { ...DEFAULT_TERMS.μηνιαία, filming: LEGACY_FILMING };
const oneOffTerms: Terms = { ...DEFAULT_TERMS.εφάπαξ, filming: LEGACY_FILMING };

const period = (
  label: string,
  starts: string,
  ends: string,
  state: AgreementPeriod["state"],
  provisions: readonly PeriodProvision[],
): AgreementPeriod => ({ label, starts, ends, state, provisions });

const socialUse = (
  shootsCarried: number,
  shootsUsed: number,
  reelsCarried: number,
  reelsUsed: number,
): readonly PeriodProvision[] => [
  { kindId: "shoot", given: 2, carried: shootsCarried, used: shootsUsed },
  { kindId: "reel", given: 8, carried: reelsCarried, used: reelsUsed },
];

export const AGREEMENTS: readonly AgreementRecord[] = [
  {
    id: "ag-kypseli-social",
    clientId: "kypseli",
    opportunityId: "o-kypseli-social",
    ownerId: "anna",
    title: "Μηνιαίο πακέτο social media",
    kind: "μηνιαία",
    state: "ενεργή",
    path: "Υπογράφηκε",
    language: "el",
    lines: [
      {
        id: "l1",
        itemId: "pkg-social",
        description: "Μηνιαία Παρουσία: 2 Γυρίσματα και 8 reels τον μήνα",
        quantity: 1,
        unitPrice: 900,
        catalogPrice: 1300,
        provisions: SOCIAL_PROVISIONS,
        catalogProvisions: SOCIAL_PROVISIONS,
        hours: { shoot: 6, edit: 14 },
        directCost: 0,
      },
    ],
    terms: monthlyTerms,
    start: "2026-07-01",
    end: "2026-12-31",
    validUntil: null,
    recipients: [
      {
        name: "Μαρία Παπαδάκη",
        email: "maria@example.com",
        isSignatory: true,
        link: "έληξε",
        opened: true,
      },
    ],
    revisions: [
      {
        number: 1,
        when: "2026-06-18",
        by: "Άννα Δημητρίου",
        summary:
          "Πρώτη πρόταση από τον Κατάλογο, με έναρξη 1/7 και τιμή 900 € (έκπτωση πρώτου πελάτη).",
        approval: {
          state: "εγκρίθηκε",
          by: "Γιώργος Μαυρίδης",
          when: "2026-06-18",
          comment: "Έκπτωση πρώτου πελάτη.",
          approvedDeviations: [
            {
              key: "price:l1",
              label:
                "Τιμή κάτω από τον Κατάλογο: «Μηνιαία Παρουσία: 2 Γυρίσματα και 8 reels τον μήνα»",
              depth: 400,
            },
          ],
        },
      },
    ],
    periods: [
      period(
        "Ιούλιος 2026",
        "2026-07-01",
        "2026-07-31",
        "κλειστή",
        socialUse(0, 1, 0, 8),
      ),
      period(
        "Αύγουστος 2026",
        "2026-08-01",
        "2026-08-31",
        "κλειστή",
        socialUse(1, 3, 0, 7),
      ),
      period(
        "Σεπτέμβριος 2026",
        "2026-09-01",
        "2026-09-30",
        "τρέχουσα",
        socialUse(0, 1, 1, 5),
      ),
      period(
        "Οκτώβριος 2026",
        "2026-10-01",
        "2026-10-31",
        "επόμενη",
        socialUse(0, 0, 0, 0),
      ),
    ],
    signature: {
      by: "Μαρία Παπαδάκη",
      when: "2026-06-24",
      method: "Σύνδεσμος πρότασης",
    },
  },
  {
    id: "ag-kypseli-launch",
    clientId: "kypseli",
    opportunityId: "o-launch",
    ownerId: "anna",
    title: "Βίντεο εγκαινίων δεύτερου καταστήματος",
    kind: "εφάπαξ",
    state: "πρόταση",
    path: "Εστάλη",
    language: "el",
    lines: [
      {
        id: "l1",
        itemId: "pkg-event-mini",
        description:
          "Εκδήλωση Μίνι: Γύρισμα εγκαινίων (μισή μέρα) και βίντεο 90″",
        quantity: 1,
        unitPrice: 840,
        catalogPrice: 400,
        provisions: [
          { kindId: "shoot", quantity: 1 },
          { kindId: "video", quantity: 1 },
        ],
        catalogProvisions: [
          { kindId: "shoot", quantity: 1 },
          { kindId: "video", quantity: 1 },
        ],
        hours: { shoot: 4, edit: 7 },
        directCost: 0,
      },
      {
        id: "l2",
        itemId: "svc-extra-reel",
        description: "Έξτρα reel",
        quantity: 3,
        unitPrice: 120,
        catalogPrice: 120,
        provisions: [{ kindId: "reel", quantity: 3 }],
        catalogProvisions: [{ kindId: "reel", quantity: 3 }],
        hours: { shoot: 0, edit: 6 },
        directCost: 0,
      },
    ],
    terms: oneOffTerms,
    start: null,
    end: null,
    validUntil: "2026-10-02",
    recipients: [
      {
        name: "Μαρία Παπαδάκη",
        email: "maria@example.com",
        isSignatory: true,
        link: "ενεργός",
        opened: true,
      },
      {
        name: "Νίκος Σταυρίδης",
        email: "nikos@example.com",
        isSignatory: false,
        link: "ενεργός",
        opened: false,
      },
    ],
    revisions: [
      {
        number: 1,
        when: "2026-09-18",
        by: "Άννα Δημητρίου",
        summary: "Πρώτη πρόταση: Εκδήλωση Μίνι στα 840 € και 3 έξτρα reels.",
      },
    ],
    periods: [],
  },
  {
    id: "ag-kinisi-social",
    clientId: "kinisi",
    opportunityId: null,
    ownerId: "anna",
    title: "Μηνιαίο πακέτο social media",
    kind: "μηνιαία",
    state: "ενεργή",
    path: "Υπογράφηκε",
    language: "el",
    lines: [
      {
        id: "l1",
        itemId: "pkg-social",
        description: "Μηνιαία Παρουσία: 2 Γυρίσματα και 8 reels τον μήνα",
        quantity: 1,
        unitPrice: 1300,
        catalogPrice: 1300,
        provisions: SOCIAL_PROVISIONS,
        catalogProvisions: SOCIAL_PROVISIONS,
        hours: { shoot: 6, edit: 14 },
        directCost: 0,
      },
    ],
    terms: {
      ...monthlyTerms,
      unusedProvisions: "μαζεύονται",
      renewal: "αυτόματη συνέχιση",
    },
    start: "2026-04-01",
    end: "2026-09-30",
    validUntil: null,
    recipients: [
      {
        name: "Σταύρος Μπαλτάς",
        email: "stavros@example.com",
        isSignatory: true,
        link: "έληξε",
        opened: true,
      },
    ],
    revisions: [
      {
        number: 1,
        when: "2026-03-20",
        by: "Άννα Δημητρίου",
        summary: "Πρόταση με «μαζεύονται» και αυτόματη συνέχιση.",
      },
    ],
    periods: [
      period(
        "Αύγουστος 2026",
        "2026-08-01",
        "2026-08-31",
        "κλειστή",
        socialUse(1, 2, 2, 9),
      ),
      period(
        "Σεπτέμβριος 2026",
        "2026-09-01",
        "2026-09-30",
        "τρέχουσα",
        socialUse(1, 1, 1, 4),
      ),
    ],
    signature: {
      by: "Σταύρος Μπαλτάς",
      when: "2026-03-25",
      method: "Σύνδεσμος πρότασης",
    },
  },
  {
    id: "ag-kinisi-extra",
    clientId: "kinisi",
    opportunityId: "o-kinisi",
    ownerId: "anna",
    title: "4 έξτρα reels τον μήνα",
    kind: "μηνιαία",
    state: "πρόταση",
    path: "Αναμένει Έγκριση",
    language: "el",
    lines: [
      {
        id: "l1",
        itemId: null,
        description: "4 επιπλέον reels τον μήνα, ίδιο υλικό",
        quantity: 1,
        unitPrice: 250,
        catalogPrice: null,
        provisions: [{ kindId: "reel", quantity: 4 }],
        catalogProvisions: null,
        hours: { shoot: 0, edit: 6 },
        directCost: 0,
      },
    ],
    terms: {
      ...monthlyTerms,
      firstMonthsDiscount: { percent: 25, months: 3 },
    },
    start: "2026-10-01",
    end: "2027-03-31",
    validUntil: "2026-10-10",
    recipients: [
      {
        name: "Σταύρος Μπαλτάς",
        email: "stavros@example.com",
        isSignatory: true,
        link: "ακυρώθηκε",
        opened: true,
      },
    ],
    revisions: [
      {
        number: 1,
        when: "2026-09-12",
        by: "Άννα Δημητρίου",
        summary: "Έκπτωση 25% τους 3 πρώτους μήνες στα έξτρα reels.",
        approval: {
          state: "εγκρίθηκε",
          by: "Δημήτρης Ιωάννου",
          when: "2026-09-13",
          comment: "Εντάξει για 3 μήνες, όχι παραπάνω.",
          approvedDeviations: [
            {
              key: "discount",
              label: "Έκπτωση 25% για 3 μήνες, πέρα από την τυπική 10% για 2",
              depth: 75,
            },
          ],
        },
      },
      {
        number: 2,
        when: "2026-09-16",
        by: "Άννα Δημητρίου",
        summary:
          "«Θέλω αλλαγές» του πελάτη: 4 reels τον μήνα ως ελεύθερη γραμμή.",
        approval: { state: "αναμένει" },
      },
    ],
    periods: [],
  },
  {
    id: "ag-kinisi-starter",
    clientId: "kinisi",
    opportunityId: null,
    ownerId: "anna",
    title: "Social Starter 2025",
    kind: "μηνιαία",
    state: "λύθηκε",
    path: "Υπογράφηκε",
    language: "el",
    lines: [
      {
        id: "l1",
        itemId: "pkg-social-starter",
        description: "Social Starter 2025: 1 Γύρισμα και 4 reels τον μήνα",
        quantity: 1,
        unitPrice: 600,
        catalogPrice: 600,
        provisions: [
          { kindId: "shoot", quantity: 1 },
          { kindId: "reel", quantity: 4 },
        ],
        catalogProvisions: [
          { kindId: "shoot", quantity: 1 },
          { kindId: "reel", quantity: 4 },
        ],
        hours: { shoot: 3, edit: 7 },
        directCost: 0,
      },
    ],
    terms: { ...monthlyTerms, durationMonths: 12 },
    start: "2025-10-01",
    end: "2026-03-31",
    validUntil: null,
    recipients: [],
    revisions: [
      {
        number: 1,
        when: "2025-09-20",
        by: "Άννα Δημητρίου",
        summary: "Πρώτη πρόταση.",
      },
    ],
    periods: [],
    signature: {
      by: "Σταύρος Μπαλτάς",
      when: "2025-09-24",
      method: "Σύνδεσμος πρότασης",
    },
    dissolution: {
      when: "2026-03-31",
      reason: "Αναβάθμιση στη Μηνιαία Παρουσία",
      by: "Δημήτρης Ιωάννου",
      fee: 0,
    },
  },
  {
    id: "ag-meli-podcast",
    clientId: "meli",
    opportunityId: "o-meli",
    ownerId: "anna",
    title: "Πακέτο podcast",
    kind: "μηνιαία",
    state: "πρόταση",
    path: "Έληξε",
    language: "el",
    lines: [
      {
        id: "l1",
        itemId: "pkg-podcast",
        description: "Podcast μηνιαίο: 2 Γυρίσματα και 4 επεισόδια",
        quantity: 1,
        unitPrice: 1100,
        catalogPrice: 1100,
        provisions: [
          { kindId: "shoot", quantity: 2 },
          { kindId: "episode", quantity: 4 },
        ],
        catalogProvisions: [
          { kindId: "shoot", quantity: 2 },
          { kindId: "episode", quantity: 4 },
        ],
        hours: { shoot: 8, edit: 12 },
        directCost: 0,
      },
    ],
    terms: { ...monthlyTerms, paymentDays: 30 },
    start: "2026-10-01",
    end: "2027-03-31",
    validUntil: "2026-09-12",
    recipients: [
      {
        name: "Ελένη Ράπτη",
        email: "eleni.rapti@example.com",
        isSignatory: true,
        link: "έληξε",
        opened: true,
      },
    ],
    revisions: [
      {
        number: 1,
        when: "2026-08-25",
        by: "Άννα Δημητρίου",
        summary: "Πρώτη πρόταση.",
      },
      {
        number: 2,
        when: "2026-08-29",
        by: "Άννα Δημητρίου",
        summary: "«Θέλω αλλαγές» της κ. Ράπτη: μέρες πληρωμής 30 αντί για 15.",
        approval: {
          state: "εγκρίθηκε",
          by: "Γιώργος Μαυρίδης",
          when: "2026-08-29",
          comment: "Οκ, ο πελάτης πληρώνει πάντα.",
          approvedDeviations: [
            {
              key: "paymentDays",
              label: "Μέρες πληρωμής 30 αντί για 15",
              depth: 15,
            },
          ],
        },
      },
    ],
    periods: [],
  },
  {
    id: "ag-armyra-2025",
    clientId: "armyra",
    opportunityId: null,
    ownerId: "nikos",
    title: "Βίντεο προβολής εστιατορίου 2025",
    kind: "εφάπαξ",
    state: "έληξε",
    path: "Υπογράφηκε",
    language: "el",
    lines: [
      {
        id: "l1",
        itemId: "pkg-corporate",
        description: "Εταιρικό βίντεο: ολοήμερο Γύρισμα, βίντεο και 3 reels",
        quantity: 1,
        unitPrice: 2200,
        catalogPrice: 2200,
        provisions: [
          { kindId: "shoot", quantity: 1 },
          { kindId: "video", quantity: 1 },
          { kindId: "reel", quantity: 3 },
        ],
        catalogProvisions: [
          { kindId: "shoot", quantity: 1 },
          { kindId: "video", quantity: 1 },
          { kindId: "reel", quantity: 3 },
        ],
        hours: { shoot: 10, edit: 24 },
        directCost: 300,
      },
    ],
    terms: oneOffTerms,
    start: "2025-05-12",
    end: "2025-06-20",
    validUntil: null,
    recipients: [],
    revisions: [
      {
        number: 1,
        when: "2025-05-02",
        by: "Νίκος Βασιλείου",
        summary: "Πρώτη πρόταση.",
      },
    ],
    periods: [],
    signature: {
      by: "Κώστας Λάμπρου",
      when: "2025-05-12",
      method: "Σύνδεσμος πρότασης",
    },
  },
  {
    id: "ag-armyra-menu",
    clientId: "armyra",
    opportunityId: "o-armyra-lost",
    ownerId: "nikos",
    title: "Φωτογράφιση μενού",
    kind: "εφάπαξ",
    state: "πρόταση",
    path: "Χάθηκε",
    language: "el",
    lines: [
      {
        id: "l1",
        itemId: "svc-photos",
        description: "Φωτογράφιση προϊόντων",
        quantity: 2,
        unitPrice: 350,
        catalogPrice: 350,
        provisions: [{ kindId: "photo", quantity: 40 }],
        catalogProvisions: [{ kindId: "photo", quantity: 40 }],
        hours: { shoot: 6, edit: 6 },
        directCost: 0,
      },
    ],
    terms: oneOffTerms,
    start: null,
    end: null,
    validUntil: "2026-06-30",
    recipients: [
      {
        name: "Κώστας Λάμπρου",
        email: "kostas@example.com",
        isSignatory: true,
        link: "ακυρώθηκε",
        opened: true,
      },
    ],
    revisions: [
      {
        number: 1,
        when: "2026-06-16",
        by: "Νίκος Βασιλείου",
        summary: "Πρώτη πρόταση.",
      },
    ],
    periods: [],
  },
  {
    id: "ag-athina-social",
    clientId: "athina",
    opportunityId: "o-athina",
    ownerId: "nikos",
    title: "Πακέτο social: 2 Γυρίσματα και 8 reels",
    kind: "μηνιαία",
    state: "ενεργή",
    path: "Υπογράφηκε",
    language: "el",
    lines: [
      {
        id: "l1",
        itemId: "pkg-social",
        description: "Μηνιαία Παρουσία: 2 Γυρίσματα και 8 reels τον μήνα",
        quantity: 1,
        unitPrice: 1300,
        catalogPrice: 1300,
        provisions: SOCIAL_PROVISIONS,
        catalogProvisions: SOCIAL_PROVISIONS,
        hours: { shoot: 6, edit: 14 },
        directCost: 0,
      },
    ],
    terms: { ...monthlyTerms, firstMonthsDiscount: { percent: 10, months: 2 } },
    start: "2026-09-05",
    end: "2027-03-04",
    validUntil: null,
    recipients: [
      {
        name: "Μαρία Σιμιτζή",
        email: "info@athina.example.com",
        isSignatory: true,
        link: "έληξε",
        opened: true,
      },
    ],
    revisions: [
      {
        number: 1,
        when: "2026-08-21",
        by: "Νίκος Βασιλείου",
        summary: "Πρώτη πρόταση με την τυπική έκπτωση 10% για 2 μήνες.",
      },
    ],
    periods: [
      period(
        "5–30 Σεπτεμβρίου 2026",
        "2026-09-05",
        "2026-09-30",
        "τρέχουσα",
        socialUse(0, 2, 0, 3),
      ),
      period(
        "Οκτώβριος 2026",
        "2026-10-01",
        "2026-10-31",
        "επόμενη",
        socialUse(0, 0, 0, 0),
      ),
    ],
    signature: {
      by: "Μαρία Σιμιτζή",
      when: "2026-08-27",
      method: "εκτός συστήματος",
      file: "symfonia-kafe-athina-ypogegrammeni.pdf",
    },
  },
];

export const findAgreement = (
  id: string | undefined,
): AgreementRecord | undefined =>
  AGREEMENTS.find((agreement) => agreement.id === id);

export const agreementOfOpportunity = (
  opportunityId: string,
): AgreementRecord | undefined =>
  AGREEMENTS.find((agreement) => agreement.opportunityId === opportunityId);

// Πόσες ενεργές Συμφωνίες έχουν γραμμή από αυτό το στοιχείο του Καταλόγου.
export const activeAgreementsOf = (itemId: string): number =>
  AGREEMENTS.filter(
    (agreement) =>
      agreement.state === "ενεργή" &&
      agreement.lines.some((line) => line.itemId === itemId),
  ).length;

export const agreementsOfClient = (
  clientId: string,
): readonly AgreementRecord[] =>
  AGREEMENTS.filter((agreement) => agreement.clientId === clientId);

export const lineTotal = (line: AgreementLine): number =>
  line.quantity * line.unitPrice;

// Τιμή ανά Περίοδο (μηνιαία) ή συνολική (εφάπαξ), πριν την έκπτωση πρώτων μηνών.
export const agreementTotal = (agreement: AgreementRecord): number =>
  agreement.lines.reduce((sum, line) => sum + lineTotal(line), 0);

export const discountedTotal = (agreement: AgreementRecord): number =>
  agreementTotal(agreement) *
  (1 - agreement.terms.firstMonthsDiscount.percent / 100);

export const withVat = (amount: number): number =>
  amount * (1 + COST_SETTINGS.vatPercent / 100);

export const statusLabel = (agreement: AgreementRecord): string =>
  agreement.state === "πρόταση" && agreement.path
    ? `πρόταση · ${agreement.path}`
    : agreement.state;

export const provisionsOf = (
  agreement: AgreementRecord,
): readonly Provision[] => {
  const totals = new Map<ProvisionKindId, number>();
  agreement.lines.forEach((line) =>
    line.provisions.forEach((provision) =>
      totals.set(
        provision.kindId,
        (totals.get(provision.kindId) ?? 0) + provision.quantity,
      ),
    ),
  );
  return [...totals].map(([kindId, quantity]) => ({ kindId, quantity }));
};

export const provisionLabel = (
  kindId: ProvisionKindId,
  quantity: number,
): string => `${quantity} ${provisionKind(kindId).unit}`;

// Κόστος και περιθώριο του συνόλου (μόνο για όσους βλέπουν κόστος). Μετριέται στο σύνολο, όχι ανά γραμμή.
export interface AgreementCost {
  hours: number;
  estimatedCost: number;
  range: { min: number; target: number; max: number };
  margin: number;
  marginPercent: number;
  isLowMargin: boolean;
}

export const costOfAgreement = (agreement: AgreementRecord): AgreementCost => {
  const hours = agreement.lines.reduce(
    (sum, line) => sum + line.hours.shoot + line.hours.edit,
    0,
  );
  const directCost = agreement.lines.reduce(
    (sum, line) => sum + line.directCost,
    0,
  );
  const estimatedCost = hours * hourCost() + directCost;
  const { min, target, max } = COST_SETTINGS.multipliers;
  const price = agreementTotal(agreement);
  const margin = price - estimatedCost;
  return {
    hours,
    estimatedCost,
    range: {
      min: estimatedCost * min,
      target: estimatedCost * target,
      max: estimatedCost * max,
    },
    margin,
    marginPercent: price > 0 ? margin / price : 0,
    // Μετριέται στη χαμηλότερη τιμή που θα πληρώσει ο πελάτης, δηλαδή μετά την έκπτωση πρώτων μηνών.
    isLowMargin: discountedTotal(agreement) < estimatedCost * min,
  };
};

const UNUSED_RANK: Readonly<Record<UnusedProvisions, number>> = {
  χάνονται: 0,
  "επόμενη Περίοδο": 1,
  μαζεύονται: 2,
};

const quantityOf = (
  provisions: readonly Provision[],
  kindId: ProvisionKindId,
): number =>
  provisions.find((provision) => provision.kindId === kindId)?.quantity ?? 0;

// Κάθε Παρέκκλιση έχει σταθερό κλειδί και «βάθος» (πόσο χειρότερη από τον Κατάλογο ή την προεπιλογή),
// ώστε η Έγκριση να δένεται με συγκεκριμένα νούμερα: νέα Έγκριση θέλει μόνο νέα ή βαθύτερη Παρέκκλιση.
export interface Deviation {
  key: string;
  label: string;
  depth: number;
}

const lineDeviations = (line: AgreementLine): readonly Deviation[] => {
  if (line.catalogPrice === null || line.catalogProvisions === null)
    return [
      {
        key: `free:${line.id}`,
        label: `Ελεύθερη γραμμή: «${line.description}»`,
        depth: 1,
      },
    ];
  const catalogProvisions = line.catalogProvisions;
  const extra = line.provisions.reduce(
    (sum, provision) =>
      sum +
      Math.max(0, provision.quantity - quantityOf(catalogProvisions, provision.kindId)),
    0,
  );
  return [
    ...(line.unitPrice < line.catalogPrice
      ? [
          {
            key: `price:${line.id}`,
            label: `Τιμή κάτω από τον Κατάλογο: «${line.description}»`,
            depth: line.catalogPrice - line.unitPrice,
          },
        ]
      : []),
    ...(extra > 0
      ? [
          {
            key: `provisions:${line.id}`,
            label: `Περισσότερες Παροχές από τον Κατάλογο: «${line.description}»`,
            depth: extra,
          },
        ]
      : []),
  ];
};

const termDeviations = (agreement: AgreementRecord): readonly Deviation[] => {
  const base = DEFAULT_TERMS[agreement.kind];
  const terms = agreement.terms;
  const discount = terms.firstMonthsDiscount;
  return [
    ...(discount.percent > STANDARD_DISCOUNT.percent ||
    discount.months > STANDARD_DISCOUNT.months
      ? [
          {
            key: "discount",
            label: `Έκπτωση ${discount.percent}% για ${discount.months} μήνες, πέρα από την τυπική ${STANDARD_DISCOUNT.percent}% για ${STANDARD_DISCOUNT.months}`,
            depth: discount.percent * discount.months,
          },
        ]
      : []),
    ...(terms.paymentDays > base.paymentDays
      ? [
          {
            key: "paymentDays",
            label: `Μέρες πληρωμής ${terms.paymentDays} αντί για ${base.paymentDays}`,
            depth: terms.paymentDays - base.paymentDays,
          },
        ]
      : []),
    ...(terms.graceDays > base.graceDays
      ? [
          {
            key: "graceDays",
            label: `Περίοδος χάριτος ${terms.graceDays} μέρες αντί για ${base.graceDays}`,
            depth: terms.graceDays - base.graceDays,
          },
        ]
      : []),
    ...(UNUSED_RANK[terms.unusedProvisions] > UNUSED_RANK[base.unusedProvisions]
      ? [
          {
            key: "unusedProvisions",
            label: `Αχρησιμοποίητες Παροχές «${terms.unusedProvisions}» αντί για «${base.unusedProvisions}»`,
            depth:
              UNUSED_RANK[terms.unusedProvisions] - UNUSED_RANK[base.unusedProvisions],
          },
        ]
      : []),
    ...(terms.filming.cancelHours < base.filming.cancelHours
      ? [
          {
            key: "cancelHours",
            label: `Όριο ακύρωσης ${terms.filming.cancelHours} ώρες αντί για ${base.filming.cancelHours}`,
            depth: base.filming.cancelHours - terms.filming.cancelHours,
          },
        ]
      : []),
  ];
};

// Παρέκκλιση = ό,τι είναι χειρότερο για την εταιρεία από τον Κατάλογο και τις προεπιλογές της στιγμής της πρότασης.
export const deviationItemsOf = (agreement: AgreementRecord): readonly Deviation[] => [
  ...agreement.lines.flatMap(lineDeviations),
  ...termDeviations(agreement),
];

export const deviationsOf = (agreement: AgreementRecord): readonly string[] =>
  deviationItemsOf(agreement).map((deviation) => deviation.label);

// Οι Παρεκκλίσεις που δεν καλύπτει η τελευταία Έγκριση: νέες, ή βαθύτερες από όσο εγκρίθηκε.
export const uncoveredDeviations = (
  current: readonly Deviation[],
  approved: readonly Deviation[],
): readonly Deviation[] =>
  current.filter((deviation) => {
    const match = approved.find((candidate) => candidate.key === deviation.key);
    return !match || deviation.depth > match.depth;
  });

export const currentRevision = (
  agreement: AgreementRecord,
): Revision | undefined => agreement.revisions.at(-1);

export const signatoryOf = (
  agreement: AgreementRecord,
): Recipient | undefined =>
  agreement.recipients.find((recipient) => recipient.isSignatory);

export const pendingApprovals = (): readonly AgreementRecord[] =>
  AGREEMENTS.filter((agreement) => agreement.path === "Αναμένει Έγκριση");

// Η Σελίδα Συμφωνίας (D2) ανοίγει από τη B4: την πρόταση της Ευκαιρίας, ή νέα πρόταση αν δεν έχει ακόμα.
export const agreementQueryFor = (
  opportunityId: string,
): Readonly<Record<string, string>> => {
  const agreement = AGREEMENTS.find(
    (candidate) => candidate.opportunityId === opportunityId,
  );
  return agreement ? { id: agreement.id } : { new: opportunityId };
};

// Έναρξη (κεφ. 3.1 #2): τυπικά η Συμφωνία τρέχει από την πραγματική ημερομηνία έναρξης ως έναρξη + Διάρκεια − 1 μέρα.
// Λογιστικά οι Περίοδοι είναι ημερολογιακοί μήνες: η πρώτη και η τελευταία μπορεί να είναι σπασμένες.
// Σπασμένη Περίοδος: ποσό αναλογικά με τις μέρες· η πρώτη δίνει ολόκληρες Παροχές, η τελευταία καμία.
const DAY_MS = 24 * 60 * 60 * 1000;

const daysInMonth = (iso: string): number => {
  const [year, month] = iso.split("-").map(Number);
  return new Date(Date.UTC(year, month, 0)).getUTCDate();
};

export const endOfTerm = (start: string, months: number): string => {
  const [year, month, day] = start.split("-").map(Number);
  const end = new Date(Date.UTC(year, month - 1 + months, day) - DAY_MS);
  return end.toISOString().slice(0, 10);
};

export const periodShare = (period: Pick<AgreementPeriod, "starts" | "ends">): number => {
  const days =
    (Date.parse(period.ends) - Date.parse(period.starts)) / DAY_MS + 1;
  return Math.min(1, days / daysInMonth(period.starts));
};

export const isPartialPeriod = (period: Pick<AgreementPeriod, "starts" | "ends">): boolean =>
  periodShare(period) < 1;

// Ο αύξων μήνας της Περιόδου από την έναρξη (0 = ο πρώτος, σπασμένος ή όχι), για την έκπτωση πρώτων μηνών.
const monthIndex = (start: string | null, periodStart: string): number => {
  if (!start) return 0;
  const [startYear, startMonth] = start.split("-").map(Number);
  const [year, month] = periodStart.split("-").map(Number);
  return (year - startYear) * 12 + (month - startMonth);
};

export const periodAmount = (
  agreement: AgreementRecord,
  period: Pick<AgreementPeriod, "starts" | "ends">,
): number => {
  const discount = agreement.terms.firstMonthsDiscount;
  const isDiscounted = monthIndex(agreement.start, period.starts) < discount.months;
  const price = isDiscounted ? discountedTotal(agreement) : agreementTotal(agreement);
  return price * periodShare(period);
};
