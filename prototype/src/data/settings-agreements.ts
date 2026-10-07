// Φανταστικά δεδομένα για O3 (Συμφωνίες) και O5 (Παραδοτέα): Όροι, Πολιτική Γυρισμάτων, είδη Παροχής.

import {
  AGREEMENTS,
  DEFAULT_TERMS,
  STANDARD_DISCOUNT,
  type Terms,
} from "@/data/agreements";
import type { ProvisionKindId } from "@/data/catalogue";
import { DELIVERABLES } from "@/data/productions";
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

// Ανοιχτά Παραδοτέα = όσα δεν έχουν εγκριθεί ή ακυρωθεί.
const isOpenDeliverable = (state: string): boolean =>
  state === "σε εργασία" || state === "αναμένει πελάτη";
const openOf = (kindId: ProvisionKindId): number =>
  DELIVERABLES.filter((d) => d.kindId === kindId && isOpenDeliverable(d.state))
    .length;

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
    changeLimit: DEFAULT_TERMS.μηνιαία.revisionLimit.reel ?? null,
    status: "Σε χρήση",
    uses: 88,
    deadlineDays: 5,
    skipsInternalReview: true,
    openDeliverables: openOf("reel"),
  },
  {
    id: "video",
    label: "Βίντεο",
    labelEn: "Video",
    unit: "βίντεο",
    measure: "ανά Γύρισμα",
    defaultDuration: "έως 3 λεπτά",
    changeLimit: DEFAULT_TERMS.μηνιαία.revisionLimit.video ?? null,
    status: "Σε χρήση",
    uses: 34,
    deadlineDays: 10,
    skipsInternalReview: false,
    openDeliverables: openOf("video"),
  },
  {
    id: "photo",
    label: "Φωτογραφία",
    labelEn: "Photo",
    unit: "φωτογραφία",
    measure: "ανά ώρα",
    defaultDuration: "",
    changeLimit: DEFAULT_TERMS.μηνιαία.revisionLimit.photo ?? null,
    status: "Σε χρήση",
    uses: 19,
    deadlineDays: 3,
    skipsInternalReview: false,
    openDeliverables: openOf("photo"),
  },
  {
    id: "podcast",
    label: "Επεισόδιο podcast",
    labelEn: "Podcast episode",
    unit: "επεισόδιο",
    measure: "ανά μέρα",
    defaultDuration: "έως 45 λεπτά",
    changeLimit: DEFAULT_TERMS.μηνιαία.revisionLimit.episode ?? null,
    status: "Σε χρήση",
    uses: 12,
    deadlineDays: 7,
    skipsInternalReview: false,
    openDeliverables: openOf("episode"),
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

const MONTHLY = DEFAULT_TERMS.μηνιαία;
const ONEOFF = DEFAULT_TERMS.εφάπαξ;

const unusedText = (terms: Terms): string =>
  terms.unusedProvisions === "επόμενη Περίοδο"
    ? "μεταφέρονται στην επόμενη Περίοδο"
    : terms.unusedProvisions;

// Όροι Συμφωνίας: διαβάζονται από τις προεπιλογές του συστήματος (DEFAULT_TERMS)· «—» όπου ο όρος δεν ισχύει για το σετ.
export const TERM_ROWS: readonly TermRow[] = [
  {
    id: "pay",
    label: "Μέρες πληρωμής",
    monthly: String(MONTHLY.paymentDays),
    oneoff: String(ONEOFF.paymentDays),
  },
  {
    id: "unused",
    label: "Αχρησιμοποίητες Παροχές",
    monthly: unusedText(MONTHLY),
    oneoff: "—",
  },
  {
    id: "grace",
    label: "Περίοδος χάριτος (μέρες)",
    monthly: String(MONTHLY.graceDays),
    oneoff: "—",
  },
  {
    id: "renew",
    label: "Διάρκεια και Ανανέωση",
    monthly: `${MONTHLY.durationMonths} μήνες, ${MONTHLY.renewal}`,
    oneoff: "—",
  },
  {
    id: "exit",
    label: "Ρήτρα λύσης (μέρες προειδοποίηση)",
    monthly: String(MONTHLY.dissolution.noticeDays),
    oneoff: "—",
  },
];

export const ONEOFF_MILESTONES = ONEOFF.milestones.map((milestone, index) => ({
  id: `m${index + 1}`,
  label: milestone.trigger === "υπογραφή" ? "Υπογραφή" : "Παράδοση",
  percent: milestone.percent,
}));

export interface FilmingPolicyRow {
  id: string;
  label: string;
  value: string;
  hint?: string;
}

const yesNo = (flag: boolean): string => (flag ? "ναι" : "όχι");

export const FILMING_POLICY: readonly FilmingPolicyRow[] = [
  {
    id: "notice",
    label: "Ελάχιστη προειδοποίηση (ώρες πριν)",
    value: String(MONTHLY.filming.noticeDays * 24),
  },
  {
    id: "cutoff",
    label: "Όριο ακύρωσης (ώρες πριν)",
    value: String(MONTHLY.filming.cancelHours),
    hint: "Πρόσφατη αλλαγή: 48 → 24. Ισχύει για νέες προτάσεις· οι υπάρχουσες Συμφωνίες κρατούν τις 48.",
  },
  {
    id: "late",
    label: "Αργή ακύρωση καίει Παροχή",
    value: yesNo(MONTHLY.filming.lateCancelBurns),
  },
  {
    id: "noshow",
    label: "«Δεν έγινε» καίει Παροχή",
    value: yesNo(MONTHLY.filming.noShowBurns),
  },
];

export const PRICING_DEFAULTS: readonly FilmingPolicyRow[] = [
  {
    id: "advance",
    label: "Προκαταβολή εφάπαξ (%)",
    value: String(ONEOFF.milestones[0]?.percent ?? 0),
    hint: "Το ποσοστό της πρώτης δόσης, στην υπογραφή.",
  },
  {
    id: "discount",
    label: "Τυπική έκπτωση πρώτων μηνών (%)",
    value: String(STANDARD_DISCOUNT.percent),
    hint: "Μεγαλύτερη έκπτωση από αυτή είναι Παρέκκλιση.",
  },
];

// O3: υπάρχοντα στοιχεία που δεν αλλάζουν με την αποθήκευση Όρων (υπολογίζονται από τις Συμφωνίες).
const activeCount = AGREEMENTS.filter((a) => a.state === "ενεργή").length;
const draftCount = AGREEMENTS.filter(
  (a) =>
    a.state === "πρόταση" &&
    (a.path === "Σύνταξη" || a.path === "Αναμένει Έγκριση" || a.path === "Εστάλη"),
).length;

export const TERMS_FORWARD = {
  affected: activeCount + draftCount,
  what: `στοιχεία (${activeCount} ενεργές Συμφωνίες και ${draftCount} προτάσεις σε εξέλιξη)`,
};

// O5
export const DELIVERABLE_RULES = {
  internalReview: "ναι",
  reworkDays: 2,
  openDeliverables: DELIVERABLES.filter((d) => isOpenDeliverable(d.state))
    .length,
} as const;
