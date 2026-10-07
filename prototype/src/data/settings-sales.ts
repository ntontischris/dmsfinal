// Ρυθμίσεις › Πωλήσεις (O2): φανταστικά δεδομένα. Μόνο για το prototype.

import { AGREEMENTS, PROPOSAL_VALIDITY_DAYS } from "@/data/agreements";
import {
  ACTIVITY_KINDS as ACTIVITY_KIND_LABELS,
  LOSS_REASONS as LOSS_REASON_LABELS,
  OPPORTUNITIES,
  SOURCES as SOURCE_LABELS,
  STAGES as STAGE_LABELS,
} from "@/data/opportunities";
import { PAST_OPPORTUNITIES } from "@/data/reports";
import type { SettingsListItem } from "@/screens/o-shared";

export interface FormAssignee {
  id: string;
  label: string;
}

export const FORM_ASSIGNEES: readonly FormAssignee[] = [
  { id: "owner", label: "Γιώργος Μαυρίδης (Ιδιοκτήτης)" },
  { id: "admin", label: "Δημήτρης Ιωάννου" },
  { id: "sales", label: "Άννα Δημητρίου" },
  { id: "none", label: "Χωρίς υπεύθυνο" },
];

// Η ουρά «Χωρίς υπεύθυνο» είναι η προεπιλογή (Blueprint κεφ. 5). Όσο αναθέτει ένας μόνο άνθρωπος, η ουρά δεν φαίνεται και η Ευκαιρία πάει σε αυτόν.
export const DEFAULT_ASSIGNEE = "none";
export { PROPOSAL_VALIDITY_DAYS };
export const PROPOSAL_VALIDITY_WAS = 14;

// Ανοιχτές προτάσεις = Συμφωνίες σε πρόταση που δεν έχουν λήξει ή χαθεί.
export const OPEN_PROPOSALS = AGREEMENTS.filter(
  (agreement) =>
    agreement.state === "πρόταση" &&
    (agreement.path === "Σύνταξη" ||
      agreement.path === "Αναμένει Έγκριση" ||
      agreement.path === "Εστάλη"),
).length;

// Οι λίστες διαβάζουν τις τιμές από το opportunities.ts και μετρούν τη χρήση από τις Ευκαιρίες (και το ιστορικό τους).
const countOf = (matches: (opportunity: { source: string; stage?: string; lostReason?: string; outcome: string }) => boolean): number =>
  [...OPPORTUNITIES, ...PAST_OPPORTUNITIES].filter(matches).length;

const inUse = (
  id: string,
  label: string,
  uses: number,
): SettingsListItem => ({ id, label, status: "Σε χρήση", uses });

const STAGE_IDS = ["new", "contact", "meeting", "proposal", "negotiation"];
const SOURCE_IDS = ["web", "instagram", "facebook", "referral", "phone", "other"];
const LOSS_IDS = ["price", "silent", "other-pick", "not-now", "scope"];
const ACTIVITY_IDS = ["call", "email", "meeting", "note"];

// «uses» στα Στάδια = ανοιχτές Ευκαιρίες. Κερδισμένη/Χαμένη είναι σταθερή Έκβαση, όχι Στάδια.
export const STAGES: readonly SettingsListItem[] = STAGE_LABELS.map(
  (label, index) =>
    inUse(
      STAGE_IDS[index],
      label,
      OPPORTUNITIES.filter(
        (o) => o.outcome === "Ανοιχτή" && o.stage === label,
      ).length,
    ),
);

export const SOURCES: readonly SettingsListItem[] = [
  ...SOURCE_LABELS.map((label, index) =>
    inUse(SOURCE_IDS[index], label, countOf((o) => o.source === label)),
  ),
  { id: "expo25", label: "Έκθεση 2025", status: "Αποσύρθηκε", uses: 0 },
];

export const LOSS_REASONS: readonly SettingsListItem[] = [
  ...LOSS_REASON_LABELS.map((label, index) =>
    inUse(LOSS_IDS[index], label, countOf((o) => o.lostReason === label)),
  ),
  { id: "budget", label: "Περιορισμένος προϋπολογισμός", status: "Νέα", uses: 0 },
];

export const ACTIVITY_KINDS: readonly SettingsListItem[] = ACTIVITY_KIND_LABELS.map(
  (label, index) =>
    inUse(
      ACTIVITY_IDS[index],
      label,
      OPPORTUNITIES.flatMap((o) => o.activities).filter((a) => a.kind === label)
        .length,
    ),
);
