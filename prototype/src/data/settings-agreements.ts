// Φανταστικά δεδομένα για O3 (Συμφωνίες) και O5 (Παραδοτέα): Όροι, Πολιτική Γυρισμάτων, είδη Παροχής.

import type { ListItemStatus } from "@/screens/o-shared";

// Σταθερές επιλογές: ο Τρόπος μέτρησης δεν αλλάζει από τις Ρυθμίσεις.
export const MEASURE_MODES = ["ανά Γύρισμα", "ανά ώρα", "ανά μέρα"] as const;
export type MeasureMode = (typeof MEASURE_MODES)[number];

export interface BenefitType {
  id: string;
  label: string;
  labelEn: string;
  unit: string;
  measure: MeasureMode;
  defaultDuration: string; // κενό = δεν έχει διάρκεια
  changeLimit: number | null; // γύροι αλλαγών, null = δεν ισχύει
  status: ListItemStatus;
  uses: number;
  // O5
  deadlineDays: number | null; // εργάσιμες· null = δεν έχει Παραδοτέο
  skipsInternalReview: boolean;
  openDeliverables: number;
}

export const BENEFIT_TYPES: readonly BenefitType[] = [
  {
    id: "filming",
    label: "Γύρισμα",
    labelEn: "Filming day",
    unit: "Γύρισμα",
    measure: "ανά Γύρισμα",
    defaultDuration: "έως 4 ώρες",
    changeLimit: null,
    status: "Σε χρήση",
    uses: 41,
    deadlineDays: null,
    skipsInternalReview: false,
    openDeliverables: 0,
  },
  {
    id: "reel",
    label: "Reel",
    labelEn: "Reel",
    unit: "βίντεο",
    measure: "ανά Γύρισμα",
    defaultDuration: "έως 60 δευτ.",
    changeLimit: 1,
    status: "Σε χρήση",
    uses: 88,
    deadlineDays: 5,
    skipsInternalReview: true,
    openDeliverables: 3,
  },
  {
    id: "video",
    label: "Βίντεο",
    labelEn: "Video",
    unit: "βίντεο",
    measure: "ανά Γύρισμα",
    defaultDuration: "έως 3 λεπτά",
    changeLimit: 3,
    status: "Σε χρήση",
    uses: 34,
    deadlineDays: 10,
    skipsInternalReview: false,
    openDeliverables: 2,
  },
  {
    id: "photo",
    label: "Φωτογραφία",
    labelEn: "Photo",
    unit: "φωτογραφία",
    measure: "ανά ώρα",
    defaultDuration: "",
    changeLimit: 2,
    status: "Σε χρήση",
    uses: 19,
    deadlineDays: 3,
    skipsInternalReview: false,
    openDeliverables: 1,
  },
  {
    id: "podcast",
    label: "Επεισόδιο podcast",
    labelEn: "Podcast episode",
    unit: "επεισόδιο",
    measure: "ανά μέρα",
    defaultDuration: "έως 45 λεπτά",
    changeLimit: 2,
    status: "Σε χρήση",
    uses: 12,
    deadlineDays: 7,
    skipsInternalReview: false,
    openDeliverables: 0,
  },
  {
    id: "drone",
    label: "Λήψεις drone",
    labelEn: "Drone footage",
    unit: "λήψη",
    measure: "ανά ώρα",
    defaultDuration: "έως 1 ώρα",
    changeLimit: 1,
    status: "Νέα",
    uses: 0,
    deadlineDays: 5,
    skipsInternalReview: false,
    openDeliverables: 0,
  },
];

export type TermSet = "monthly" | "oneoff";

export interface TermRow {
  id: string;
  label: string;
  monthly: string;
  oneoff: string;
  hint?: string;
}

// Όροι Συμφωνίας: «—» όπου ο όρος δεν ισχύει για το σετ.
export const TERM_ROWS: readonly TermRow[] = [
  { id: "pay", label: "Μέρες πληρωμής", monthly: "15", oneoff: "15" },
  {
    id: "unused",
    label: "Αχρησιμοποίητες Παροχές",
    monthly: "μεταφέρονται στην επόμενη Περίοδο",
    oneoff: "—",
  },
  { id: "grace", label: "Περίοδος χάριτος (μέρες)", monthly: "5", oneoff: "—" },
  {
    id: "renew",
    label: "Διάρκεια και Ανανέωση",
    monthly: "12 μήνες, αυτόματη συνέχιση",
    oneoff: "—",
  },
  {
    id: "exit",
    label: "Ρήτρα λύσης (μέρες προειδοποίηση)",
    monthly: "30",
    oneoff: "—",
  },
];

export const ONEOFF_MILESTONES = [
  { id: "m1", label: "Υπογραφή", percent: 50 },
  { id: "m2", label: "Παράδοση", percent: 50 },
] as const;

export interface FilmingPolicyRow {
  id: string;
  label: string;
  value: string;
  hint?: string;
}

export const FILMING_POLICY: readonly FilmingPolicyRow[] = [
  { id: "notice", label: "Ελάχιστη προειδοποίηση (μέρες)", value: "3" },
  {
    id: "cutoff",
    label: "Όριο ακύρωσης (ώρες πριν)",
    value: "24",
    hint: "Πρόσφατη αλλαγή: 48 → 24.",
  },
  { id: "late", label: "Αργή ακύρωση καίει Παροχή", value: "ναι" },
  { id: "noshow", label: "«Δεν έγινε» καίει Παροχή", value: "ναι" },
];

export const PRICING_DEFAULTS: readonly FilmingPolicyRow[] = [
  { id: "advance", label: "Προκαταβολή (%)", value: "30" },
  {
    id: "discount",
    label: "Τυπική έκπτωση πρώτων μηνών (%)",
    value: "10",
    hint: "Μεγαλύτερη έκπτωση από αυτή είναι Παρέκκλιση.",
  },
];

// O3: υπάρχοντα στοιχεία που δεν αλλάζουν με την αποθήκευση Όρων.
export const TERMS_FORWARD = {
  affected: 3,
  what: "στοιχεία (2 υπογεγραμμένες Συμφωνίες και 1 πρόταση σε σύνταξη)",
};

// O5
export const DELIVERABLE_RULES = {
  internalReview: "ναι",
  reworkDays: 2,
  openDeliverables: 6,
} as const;
