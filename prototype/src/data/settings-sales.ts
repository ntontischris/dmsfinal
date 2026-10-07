// Ρυθμίσεις › Πωλήσεις (O2): φανταστικά δεδομένα. Μόνο για το prototype.

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

export const DEFAULT_ASSIGNEE = "owner";
export const PROPOSAL_VALIDITY_DAYS = 21;
export const PROPOSAL_VALIDITY_WAS = 14;
export const OPEN_PROPOSALS = 3;

// «uses» στα Στάδια = ανοιχτές Ευκαιρίες. Κερδισμένη/Χαμένη είναι σταθερή Έκβαση, όχι Στάδια.
export const STAGES: readonly SettingsListItem[] = [
  { id: "new", label: "Νέα", status: "Σε χρήση", uses: 4 },
  { id: "contact", label: "Πρώτη επαφή", status: "Σε χρήση", uses: 6 },
  { id: "meeting", label: "Συνάντηση", status: "Σε χρήση", uses: 3 },
  { id: "proposal", label: "Πρόταση", status: "Σε χρήση", uses: 4 },
  { id: "negotiation", label: "Διαπραγμάτευση", status: "Σε χρήση", uses: 5 },
];

export const SOURCES: readonly SettingsListItem[] = [
  { id: "web", label: "Ιστοσελίδα", status: "Σε χρήση", uses: 18 },
  {
    id: "social",
    label: "Instagram και Facebook",
    status: "Σε χρήση",
    uses: 9,
  },
  { id: "referral", label: "Σύσταση", status: "Σε χρήση", uses: 14 },
  { id: "phone", label: "Τηλέφωνο", status: "Σε χρήση", uses: 7 },
  { id: "other", label: "Άλλο", status: "Σε χρήση", uses: 3 },
  { id: "expo25", label: "Έκθεση 2025", status: "Αποσύρθηκε", uses: 5 },
];

export const LOSS_REASONS: readonly SettingsListItem[] = [
  { id: "price", label: "Τιμή", status: "Σε χρήση", uses: 8 },
  { id: "silent", label: "Δεν απάντησε", status: "Σε χρήση", uses: 11 },
  { id: "other-pick", label: "Επέλεξε άλλον", status: "Σε χρήση", uses: 6 },
  { id: "not-now", label: "Όχι τώρα", status: "Σε χρήση", uses: 4 },
  { id: "scope", label: "Εκτός αντικειμένου", status: "Σε χρήση", uses: 2 },
  { id: "budget", label: "Περιορισμένος προϋπολογισμός", status: "Νέα", uses: 0 },
];

export const ACTIVITY_KINDS: readonly SettingsListItem[] = [
  { id: "call", label: "Κλήση", status: "Σε χρήση", uses: 52 },
  { id: "email", label: "Email", status: "Σε χρήση", uses: 63 },
  { id: "meeting", label: "Συνάντηση", status: "Σε χρήση", uses: 21 },
  { id: "note", label: "Σημείωση", status: "Σε χρήση", uses: 34 },
];
