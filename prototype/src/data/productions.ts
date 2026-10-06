// Φανταστικά δεδομένα του module «7 Παραγωγές»: κατάσταση, Εργασίες, Παραδοτέα (σύνοψη), Τιμολογητέα έξτρα,
// Πραγματικές ώρες και ίχνος ενεργειών κάθε Παραγωγής. Η ταυτότητα (τίτλος, Πελάτης, Περίοδος, Μέλη) ζει στο filming.ts.
// Repo public: μόνο επινοημένα ονόματα και νούμερα. Οι τιμές είναι χωρίς ΦΠΑ.
// Πηγές: κεφ. 3.5 (Παραγωγή, «Λεπτομέρειες κανόνων: Παραγωγή»), κεφ. 3.3 (μοντέλο κόστους), ADR 0011, ADR 0017.

import type { ProvisionKindId } from "@/data/catalogue";

export type ProductionState = "ανοιχτή" | "παραδομένη" | "ακυρωμένη";

// Τα Παραδοτέα εδώ είναι σύνοψη για τη Σελίδα Παραγωγής. Το module «Παραδοτέα και Εγκρίσεις» τα στήνει πλήρως.
export type DeliverableState =
  "σε εργασία" | "αναμένει πελάτη" | "εγκρίθηκε" | "ακυρώθηκε";

export interface DeliverableSummary {
  id: string;
  productionId: string;
  title: string;
  kindId: ProvisionKindId;
  assigneeId: string;
  state: DeliverableState;
  latest?: { version: number; inReview: boolean; sentAt?: string };
  deadline: string;
  rounds: { used: number; limit: number };
  extra?: "με χρέωση" | "χωρίς χρέωση";
  cancellation?: { reason: string; provision: "καταναλώθηκε" | "επιστρέφει" };
  approvedAt?: string;
}

export interface ProductionTask {
  id: string;
  productionId: string;
  title: string;
  assigneeId: string;
  due?: string;
  doneAt?: string;
}

// Τιμολογητέα που γέννησε η Παραγωγή (έξτρα Παραδοτέο, έξτρα αναθεώρηση, αλλαγή που χρεώνεται).
// Οι ώρες είναι οι Εκτιμώμενες ώρες της Υπηρεσίας στη Συμφωνία· τα «χωρίς χρέωση» έχουν ώρες και καμία τιμή.
export interface ProductionExtra {
  label: string;
  amount: number;
  hours: { shoot: number; edit: number };
}

export interface ActualHours {
  shoot: number | null;
  shootConfirmed: boolean;
  edit: number | null;
  directCost: number | null;
  by?: string;
  when?: string;
}

export interface TrailEntry {
  when: string;
  who: string;
  what: string;
  costOnly?: boolean;
}

export interface ProductionRecord {
  id: string;
  state: ProductionState;
  createdAt: string;
  delivery?: {
    when: string;
    by: "σύστημα" | string;
    comment?: string;
  };
  cancellation?: { when: string; by: string; reason: string };
  // Εσωτερική Παραγωγή: εκτίμηση που έγραψε όποιος «Διαχειρίζεται κόστος» (προαιρετική).
  internalEstimate?: { shoot: number; edit: number };
  extras: readonly ProductionExtra[];
  hours: ActualHours;
  trail: readonly TrailEntry[];
}

// Κόστος ώρας ανά μήνα (ζει στα Οικονομικά, I6). Οι κλεισμένοι μήνες δεν αλλάζουν.
export const HOUR_COST_BY_MONTH: Readonly<Record<string, number>> = {
  "2025-06": 38,
  "2026-07": 40,
  "2026-08": 40,
  "2026-09": 40,
  "2026-10": 40,
};

const NO_HOURS: ActualHours = {
  shoot: null,
  shootConfirmed: false,
  edit: null,
  directCost: null,
};

const approvedReels = (
  productionId: string,
  count: number,
  assignees: readonly string[],
  approvedAt: string,
): DeliverableSummary[] =>
  Array.from({ length: count }, (_, index) => ({
    id: `${productionId}-r${index + 1}`,
    productionId,
    title: `Reel ${index + 1}`,
    kindId: "reel" as const,
    assigneeId: assignees[index % assignees.length],
    state: "εγκρίθηκε" as const,
    latest: { version: 1, inReview: false },
    deadline: approvedAt,
    rounds: { used: index % 3 === 0 ? 1 : 0, limit: 1 },
    approvedAt,
  }));

export const DELIVERABLES: readonly DeliverableSummary[] = [
  ...approvedReels("pr-kypseli-07", 8, ["aris", "sofia"], "2026-08-12"),
  ...approvedReels("pr-kypseli-08", 7, ["aris", "sofia"], "2026-09-04"),
  ...approvedReels("pr-kinisi-08", 9, ["aris"], "2026-09-02"),
  {
    id: "d-kypseli-09-1",
    productionId: "pr-kypseli-09",
    title: "Reel: φθινοπωρινό μενού",
    kindId: "reel",
    assigneeId: "aris",
    state: "εγκρίθηκε",
    latest: { version: 1, inReview: false, sentAt: "2026-09-11" },
    deadline: "2026-09-15",
    rounds: { used: 0, limit: 1 },
    approvedAt: "2026-09-12",
  },
  {
    id: "d-kypseli-09-2",
    productionId: "pr-kypseli-09",
    title: "Reel: πρωινός καφές στη μπάρα",
    kindId: "reel",
    assigneeId: "aris",
    state: "εγκρίθηκε",
    latest: { version: 2, inReview: false, sentAt: "2026-09-14" },
    deadline: "2026-09-15",
    rounds: { used: 1, limit: 1 },
    approvedAt: "2026-09-15",
  },
  {
    id: "d-kypseli-09-3",
    productionId: "pr-kypseli-09",
    title: "Reel: η Μαρία στη μπάρα",
    kindId: "reel",
    assigneeId: "sofia",
    state: "αναμένει πελάτη",
    latest: { version: 1, inReview: false, sentAt: "2026-09-18" },
    deadline: "2026-09-17",
    rounds: { used: 0, limit: 1 },
  },
  {
    id: "d-kypseli-09-4",
    productionId: "pr-kypseli-09",
    title: "Reel: το γλυκό της εβδομάδας",
    kindId: "reel",
    assigneeId: "aris",
    state: "σε εργασία",
    latest: { version: 1, inReview: true },
    deadline: "2026-09-23",
    rounds: { used: 0, limit: 1 },
  },
  {
    id: "d-kypseli-09-5",
    productionId: "pr-kypseli-09",
    title: "Reel: πίσω από τον πάγκο",
    kindId: "reel",
    assigneeId: "aris",
    state: "σε εργασία",
    deadline: "2026-09-18",
    rounds: { used: 0, limit: 1 },
  },
  {
    id: "d-kypseli-09-6",
    productionId: "pr-kypseli-09",
    title: "Reel: συνταγή της εβδομάδας",
    kindId: "reel",
    assigneeId: "sofia",
    state: "ακυρώθηκε",
    deadline: "2026-09-22",
    rounds: { used: 0, limit: 1 },
    cancellation: {
      reason: "Ο πελάτης άλλαξε το μενού· η συνταγή δεν ισχύει πια.",
      provision: "επιστρέφει",
    },
  },
  {
    id: "d-kinisi-09-1",
    productionId: "pr-kinisi-09",
    title: "Reel: νέα τμήματα pilates",
    kindId: "reel",
    assigneeId: "aris",
    state: "εγκρίθηκε",
    latest: { version: 1, inReview: false, sentAt: "2026-09-08" },
    deadline: "2026-09-10",
    rounds: { used: 0, limit: 1 },
    approvedAt: "2026-09-09",
  },
  {
    id: "d-kinisi-09-2",
    productionId: "pr-kinisi-09",
    title: "Reel: πρόγραμμα φθινοπώρου",
    kindId: "reel",
    assigneeId: "aris",
    state: "εγκρίθηκε",
    latest: { version: 1, inReview: false, sentAt: "2026-09-08" },
    deadline: "2026-09-10",
    rounds: { used: 0, limit: 1 },
    approvedAt: "2026-09-10",
  },
  {
    id: "d-kinisi-09-3",
    productionId: "pr-kinisi-09",
    title: "Reel: ο προπονητής του μήνα",
    kindId: "reel",
    assigneeId: "aris",
    state: "αναμένει πελάτη",
    latest: { version: 2, inReview: false, sentAt: "2026-09-14" },
    deadline: "2026-09-16",
    rounds: { used: 1, limit: 1 },
  },
  {
    id: "d-kinisi-09-4",
    productionId: "pr-kinisi-09",
    title: "Reel: εγκαίνια αίθουσας",
    kindId: "reel",
    assigneeId: "aris",
    state: "σε εργασία",
    deadline: "2026-09-24",
    rounds: { used: 0, limit: 1 },
  },
  {
    id: "d-athina-09-1",
    productionId: "pr-athina-09",
    title: "Reel: καλωσόρισμα",
    kindId: "reel",
    assigneeId: "sofia",
    state: "εγκρίθηκε",
    latest: { version: 1, inReview: false, sentAt: "2026-09-12" },
    deadline: "2026-09-15",
    rounds: { used: 0, limit: 1 },
    approvedAt: "2026-09-13",
  },
  {
    id: "d-athina-09-2",
    productionId: "pr-athina-09",
    title: "Reel: ο barista",
    kindId: "reel",
    assigneeId: "sofia",
    state: "σε εργασία",
    latest: { version: 1, inReview: true },
    deadline: "2026-09-21",
    rounds: { used: 0, limit: 1 },
  },
  {
    id: "d-athina-09-3",
    productionId: "pr-athina-09",
    title: "Reel: βραδιά jazz",
    kindId: "reel",
    assigneeId: "dimitris",
    state: "σε εργασία",
    deadline: "2026-09-25",
    rounds: { used: 0, limit: 1 },
  },
  {
    id: "d-armyra-1",
    productionId: "pr-armyra-2025",
    title: "Εταιρικό βίντεο (2΄)",
    kindId: "video",
    assigneeId: "sofia",
    state: "εγκρίθηκε",
    latest: { version: 3, inReview: false, sentAt: "2025-06-10" },
    deadline: "2025-06-12",
    rounds: { used: 2, limit: 3 },
    approvedAt: "2025-06-11",
  },
  {
    id: "d-armyra-2",
    productionId: "pr-armyra-2025",
    title: "Reel: η κουζίνα",
    kindId: "reel",
    assigneeId: "aris",
    state: "εγκρίθηκε",
    latest: { version: 1, inReview: false, sentAt: "2025-06-05" },
    deadline: "2025-06-12",
    rounds: { used: 0, limit: 1 },
    approvedAt: "2025-06-06",
  },
  {
    id: "d-armyra-3",
    productionId: "pr-armyra-2025",
    title: "Reel: ηλιοβασίλεμα στη βεράντα",
    kindId: "reel",
    assigneeId: "aris",
    state: "εγκρίθηκε",
    latest: { version: 1, inReview: false, sentAt: "2025-06-05" },
    deadline: "2025-06-12",
    rounds: { used: 0, limit: 1 },
    approvedAt: "2025-06-07",
  },
  {
    id: "d-armyra-4",
    productionId: "pr-armyra-2025",
    title: "Reel: οι ψαράδες",
    kindId: "reel",
    assigneeId: "aris",
    state: "αναμένει πελάτη",
    latest: { version: 1, inReview: false, sentAt: "2025-06-05" },
    deadline: "2025-06-12",
    rounds: { used: 0, limit: 1 },
  },
  {
    id: "d-showreel-1",
    productionId: "pr-showreel-2026",
    title: "Showreel 2026 (90″)",
    kindId: "video",
    assigneeId: "aris",
    state: "σε εργασία",
    latest: { version: 2, inReview: true },
    deadline: "2026-10-09",
    rounds: { used: 1, limit: 0 },
  },
  {
    id: "d-showreel-2",
    productionId: "pr-showreel-2026",
    title: "Showreel 2026, κάθετη εκδοχή (30″)",
    kindId: "reel",
    assigneeId: "aris",
    state: "σε εργασία",
    deadline: "2026-10-16",
    rounds: { used: 0, limit: 0 },
  },
];

export const TASKS: readonly ProductionTask[] = [
  {
    id: "t-kypseli-09-1",
    productionId: "pr-kypseli-09",
    title: "Μουσική για τα reels του μήνα",
    assigneeId: "aris",
    doneAt: "2026-09-10",
  },
  {
    id: "t-kypseli-09-2",
    productionId: "pr-kypseli-09",
    title: "Υπότιτλοι στο reel της Μαρίας",
    assigneeId: "sofia",
    due: "2026-09-22",
  },
  {
    id: "t-kypseli-09-3",
    productionId: "pr-kypseli-09",
    title: "Άδεια για πλάνα πελατών στη μπάρα",
    assigneeId: "aris",
    due: "2026-09-19",
  },
  {
    id: "t-kypseli-10-1",
    productionId: "pr-kypseli-10",
    title: "Ερωτήσεις συνέντευξης για το δεύτερο κατάστημα",
    assigneeId: "aris",
    due: "2026-09-30",
  },
  {
    id: "t-kinisi-09-1",
    productionId: "pr-kinisi-09",
    title: "Λίστα πλάνων για τα νέα τμήματα",
    assigneeId: "aris",
    doneAt: "2026-09-02",
  },
  {
    id: "t-athina-09-1",
    productionId: "pr-athina-09",
    title: "Γραμματοσειρές και χρώματα του καφέ στα reels",
    assigneeId: "dimitris",
    due: "2026-09-24",
  },
  {
    id: "t-showreel-1",
    productionId: "pr-showreel-2026",
    title: "Επιλογή πλάνων από τις Παραγωγές του 2026",
    assigneeId: "giorgos",
    doneAt: "2026-09-15",
  },
  {
    id: "t-showreel-2",
    productionId: "pr-showreel-2026",
    title: "Άδειες μουσικής",
    assigneeId: "aris",
    due: "2026-10-05",
  },
];

export const PRODUCTION_RECORDS: readonly ProductionRecord[] = [
  {
    id: "pr-kypseli-07",
    state: "παραδομένη",
    createdAt: "2026-07-01",
    delivery: { when: "2026-08-12", by: "σύστημα" },
    extras: [],
    hours: {
      shoot: 5,
      shootConfirmed: true,
      edit: 11,
      directCost: 0,
      by: "Γιώργος Μαυρίδης",
      when: "2026-08-16",
    },
    trail: [
      {
        when: "2026-07-01",
        who: "σύστημα",
        what: "Άνοιξε με την Περίοδο «Ιούλιος 2026».",
      },
      {
        when: "2026-08-12",
        who: "σύστημα",
        what: "Παραδόθηκε: εγκρίθηκε και το τελευταίο Παραδοτέο.",
      },
      {
        when: "2026-08-14",
        who: "Γιώργος Μαυρίδης",
        what: "Πραγματικές ώρες: γύρισμα 5, μοντάζ 21. Άναψε «Υπέρβαση κόστους».",
        costOnly: true,
      },
      {
        when: "2026-08-16",
        who: "Γιώργος Μαυρίδης",
        what: "Διόρθωσε μοντάζ 21 → 11 (λάθος πληκτρολόγησης). Η «Υπέρβαση κόστους» έσβησε.",
        costOnly: true,
      },
    ],
  },
  {
    id: "pr-kypseli-08",
    state: "παραδομένη",
    createdAt: "2026-08-01",
    delivery: { when: "2026-09-04", by: "σύστημα" },
    extras: [],
    hours: NO_HOURS,
    trail: [
      {
        when: "2026-08-01",
        who: "σύστημα",
        what: "Άνοιξε με την Περίοδο «Αύγουστος 2026».",
      },
      {
        when: "2026-09-04",
        who: "σύστημα",
        what: "Παραδόθηκε: εγκρίθηκε και το τελευταίο Παραδοτέο.",
      },
      {
        when: "2026-09-04",
        who: "σύστημα",
        what: "Υπενθύμιση: λείπουν οι Πραγματικές ώρες.",
        costOnly: true,
      },
    ],
  },
  {
    id: "pr-kypseli-09",
    state: "ανοιχτή",
    createdAt: "2026-09-01",
    extras: [],
    hours: { ...NO_HOURS, shoot: 6 },
    trail: [
      {
        when: "2026-09-01",
        who: "σύστημα",
        what: "Άνοιξε με την Περίοδο «Σεπτέμβριος 2026». Υπεύθυνος και Μέλη από τον Αύγουστο.",
      },
      {
        when: "2026-09-08",
        who: "Άρης Κωνσταντίνου",
        what: "Γύρισμα 8/9 σημειώθηκε «έγινε».",
      },
      {
        when: "2026-09-16",
        who: "Σοφία Λαζαρίδου",
        what: "Ακύρωσε το «Reel: συνταγή της εβδομάδας»· η Παροχή επιστρέφει.",
      },
    ],
  },
  {
    id: "pr-kypseli-10",
    state: "ανοιχτή",
    createdAt: "2026-09-16",
    extras: [],
    hours: NO_HOURS,
    trail: [
      {
        when: "2026-09-16",
        who: "σύστημα",
        what: "Άνοιξε νωρίς: κλείστηκε Γύρισμα στην επόμενη Περίοδο (2/10).",
      },
    ],
  },
  {
    id: "pr-kinisi-08",
    state: "παραδομένη",
    createdAt: "2026-08-01",
    delivery: { when: "2026-09-02", by: "σύστημα" },
    extras: [
      {
        label: "Έξτρα αναθεώρηση: Reel 4",
        amount: 80,
        hours: { shoot: 0, edit: 0 },
      },
    ],
    hours: {
      shoot: 7,
      shootConfirmed: true,
      edit: 24,
      directCost: 0,
      by: "Γιώργος Μαυρίδης",
      when: "2026-09-03",
    },
    trail: [
      {
        when: "2026-08-01",
        who: "σύστημα",
        what: "Άνοιξε με την Περίοδο «Αύγουστος 2026».",
      },
      {
        when: "2026-08-20",
        who: "Άρης Κωνσταντίνου",
        what: "Γεννήθηκε Τιμολογητέο «έξτρα αναθεώρηση» για το Reel 4.",
      },
      {
        when: "2026-09-02",
        who: "σύστημα",
        what: "Παραδόθηκε: εγκρίθηκε και το τελευταίο Παραδοτέο.",
      },
      {
        when: "2026-09-03",
        who: "Γιώργος Μαυρίδης",
        what: "Πραγματικές ώρες: γύρισμα 7, μοντάζ 24. Άναψε «Υπέρβαση κόστους».",
        costOnly: true,
      },
    ],
  },
  {
    id: "pr-kinisi-09",
    state: "ανοιχτή",
    createdAt: "2026-09-01",
    extras: [],
    hours: NO_HOURS,
    trail: [
      {
        when: "2026-09-01",
        who: "σύστημα",
        what: "Άνοιξε με την Περίοδο «Σεπτέμβριος 2026».",
      },
    ],
  },
  {
    id: "pr-athina-09",
    state: "ανοιχτή",
    createdAt: "2026-09-05",
    extras: [],
    hours: NO_HOURS,
    trail: [
      {
        when: "2026-09-05",
        who: "σύστημα",
        what: "Άνοιξε με την πρώτη Περίοδο «5–30 Σεπτεμβρίου 2026». Υπεύθυνη ορίστηκε η Σοφία.",
      },
    ],
  },
  {
    id: "pr-athina-10",
    state: "ανοιχτή",
    createdAt: "2026-09-18",
    extras: [],
    hours: NO_HOURS,
    trail: [
      {
        when: "2026-09-18",
        who: "σύστημα",
        what: "Άνοιξε νωρίς: κλείστηκε Γύρισμα στην επόμενη Περίοδο (2/10).",
      },
    ],
  },
  {
    id: "pr-armyra-2025",
    state: "παραδομένη",
    createdAt: "2025-05-12",
    delivery: {
      when: "2025-06-20",
      by: "Σοφία Λαζαρίδου",
      comment:
        "Ο πελάτης δεν απάντησε για το τρίτο reel μετά από δύο υπενθυμίσεις· το επιβεβαίωσε στο τηλέφωνο. Κλείνουμε τη δουλειά.",
    },
    extras: [],
    hours: {
      shoot: 8,
      shootConfirmed: true,
      edit: 22,
      directCost: 300,
      by: "Γιώργος Μαυρίδης",
      when: "2025-06-24",
    },
    trail: [
      {
        when: "2025-05-12",
        who: "σύστημα",
        what: "Άνοιξε με την υπογραφή της εφάπαξ Συμφωνίας.",
      },
      {
        when: "2025-06-20",
        who: "Σοφία Λαζαρίδου",
        what: "Παράδοση χειροκίνητα, με σχόλιο.",
      },
      {
        when: "2025-06-24",
        who: "Γιώργος Μαυρίδης",
        what: "Πραγματικές ώρες: γύρισμα 8, μοντάζ 22, άμεσο κόστος 300 €.",
        costOnly: true,
      },
    ],
  },
  {
    id: "pr-showreel-2026",
    state: "ανοιχτή",
    createdAt: "2026-09-01",
    internalEstimate: { shoot: 4, edit: 16 },
    extras: [],
    hours: NO_HOURS,
    trail: [
      {
        when: "2026-09-01",
        who: "Γιώργος Μαυρίδης",
        what: "Νέα Εσωτερική Παραγωγή «Showreel 2026».",
      },
      {
        when: "2026-09-19",
        who: "Άρης Κωνσταντίνου",
        what: "v2 του showreel: αναμένει εσωτερικό έλεγχο.",
      },
    ],
  },
];

export const findProductionRecord = (
  id: string | undefined,
): ProductionRecord | undefined =>
  PRODUCTION_RECORDS.find((record) => record.id === id);

export const deliverablesOf = (
  productionId: string,
): readonly DeliverableSummary[] =>
  DELIVERABLES.filter((item) => item.productionId === productionId);

export const tasksOf = (productionId: string): readonly ProductionTask[] =>
  TASKS.filter((task) => task.productionId === productionId);
