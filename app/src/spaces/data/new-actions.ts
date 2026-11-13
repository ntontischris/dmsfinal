// Το «+ Νέο» πάνω δεξιά: κάθε δημιουργία από οπουδήποτε, χωρίς να θυμάσαι σε ποιον Χώρο ζει.
// Φαίνεται μόνο ό,τι ο Χρήστης μπορεί να ανοίξει (ίδια Δικαιώματα με τη σελίδα της). Από το prototype `data/new-actions.ts`,
// μόνο με όσες έχουν πραγματική σελίδα: το «Ρεπό / Άδεια» είναι ο κλεισμένος χρόνος του Ημερολογίου (A6).

import { hrefOf, type Allows } from "@/spaces/data/screens";

export interface NewAction {
  label: string;
  code: string;
  // Όλα αυτά τα Δικαιώματα χρειάζονται (όπως τα ελέγχει η σελίδα της φόρμας).
  requires: readonly string[];
  // Αρκεί ένα από αυτά (π.χ. η Πρόσκληση: ομάδας ή πελάτη).
  requiresAny?: readonly string[];
  // Query που ανοίγει την οθόνη έτοιμη για τη δημιουργία.
  query?: Readonly<Record<string, string>>;
  // Σύντομο όνομα για το κουμπί, όταν είναι η μόνη δημιουργία του Χρήστη.
  soloLabel?: string;
}

const NEW_ACTIONS: readonly NewAction[] = [
  { label: "Νέο Γύρισμα", code: "E4", requires: ["filming.book"] },
  {
    label: "Νέα Ευκαιρία",
    code: "B1",
    requires: ["clients.manage"],
    query: { new: "1" },
  },
  {
    label: "Καταχώρηση Τιμολογίου",
    code: "I3",
    requires: ["finance.view", "finance.invoices"],
  },
  {
    label: "Πρόσκληση Χρήστη",
    code: "N6",
    requires: [],
    requiresAny: ["access.team", "access.clientUsers"],
    soloLabel: "Πρόσκληση",
  },
  {
    label: "Ρεπό / Άδεια / ραντεβού",
    code: "A6",
    requires: ["team"],
    soloLabel: "Ρεπό / Άδεια",
  },
  {
    label: "Κράτηση Γυρίσματος",
    code: "E5",
    requires: ["c.book"],
    soloLabel: "Κράτηση",
  },
];

export const newActionsFor = (allows: Allows): readonly NewAction[] =>
  NEW_ACTIONS.filter(
    (action) =>
      action.requires.every(allows) &&
      (action.requiresAny === undefined || action.requiresAny.some(allows)),
  );

export type NewEntry =
  | { kind: "menu"; actions: readonly NewAction[] }
  | { kind: "single"; action: NewAction; label: string };

// Μενού μόνο όταν υπάρχει επιλογή· με μία δημιουργία το «Νέο» γίνεται κουμπί με το όνομά της.
export const newEntryFor = (allows: Allows): NewEntry | null => {
  const actions = newActionsFor(allows);
  if (actions.length === 0) return null;
  if (actions.length > 1) return { kind: "menu", actions };
  const [action] = actions;
  return { kind: "single", action, label: action.soloLabel ?? action.label };
};

// Κάθε πάτημα ανοίγει τη φόρμα από την αρχή, και όταν είσαι ήδη στην οθόνη: το query παίρνει νέα τιμή κάθε φορά.
export const newActionHref = (action: NewAction, stamp: string): string =>
  hrefOf(
    action.code,
    Object.fromEntries(
      Object.keys(action.query ?? {}).map((key) => [key, stamp]),
    ),
  );
