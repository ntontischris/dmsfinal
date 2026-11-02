// Αναζήτηση εγγραφών (Ctrl+K): τα είδη, ο έλεγχος του όρου και η ομαδοποίηση. Καθαρό αρχείο: το διαβάζει και ο browser.

import { z } from "zod";

import { matchesSearch } from "@/spaces/data/search-match";
import { isCodeVisible, type Allows } from "@/spaces/data/screens";
import { spacesModel } from "@/spaces/data/spaces";

export const RECORD_KINDS = [
  "clients",
  "productions",
  "filmings",
  "deliverables",
  "invoices",
  "agreements",
] as const;
export type RecordKind = (typeof RECORD_KINDS)[number];

// Η επικεφαλίδα κάθε ομάδας και η οθόνη-λίστα που πρέπει να βλέπει ο Χρήστης στους Χώρους του.
export const KIND_INFO: Readonly<
  Record<RecordKind, { label: string; code: string }>
> = {
  clients: { label: "Πελάτες", code: "B1" },
  productions: { label: "Παραγωγές", code: "G1" },
  filmings: { label: "Γυρίσματα", code: "E1" },
  deliverables: { label: "Παραδοτέα", code: "H1" },
  invoices: { label: "Τιμολόγια", code: "I2" },
  agreements: { label: "Συμφωνίες", code: "D1" },
};

export const RECORD_LIMIT = 5;
export const MIN_TERM = 2;

export interface RecordHit {
  id: string;
  label: string;
  // Π.χ. ο Πελάτης ή η ημερομηνία.
  sublabel: string | null;
  href: string;
}

export interface RecordGroup {
  kind: RecordKind;
  label: string;
  hits: readonly RecordHit[];
}

export const termSchema = z.string().trim().min(MIN_TERM).max(60);

// Ένα είδος φαίνεται μόνο αν η οθόνη-λίστα του είναι ορατή και ανήκει σε Χώρο του Χρήστη (ο πελάτης έχει δικούς του).
export const visibleKinds = (allows: Allows): readonly RecordKind[] => {
  const codes = new Set(
    spacesModel(allows).spaces.flatMap((view) => view.codes),
  );
  return RECORD_KINDS.filter(
    (kind) =>
      codes.has(KIND_INFO[kind].code) &&
      isCodeVisible(KIND_INFO[kind].code, allows),
  );
};

export type KindResult = {
  kind: RecordKind;
  hits: readonly RecordHit[] | null;
};

// Οι ομάδες με τη σειρά των ειδών· όσες απέτυχαν (null) ή δεν βρήκαν τίποτα λείπουν.
export const groupsOf = (
  results: readonly KindResult[],
): readonly RecordGroup[] =>
  RECORD_KINDS.flatMap((kind) => {
    const hits = results.find((result) => result.kind === kind)?.hits;
    return hits && hits.length > 0
      ? [
          {
            kind,
            label: KIND_INFO[kind].label,
            hits: hits.slice(0, RECORD_LIMIT),
          },
        ]
      : [];
  });

// Για τα είδη που διαβάζονται από τη λίστα της οθόνης τους (οι πίνακες είναι κλειστοί): ταίριασμα όπως στις ενότητες.
export const pickMatches = <T>(
  rows: readonly T[],
  options: { term: string; limit: number; textOf: (row: T) => string },
): readonly T[] =>
  rows
    .filter((row) => matchesSearch(options.textOf(row), options.term))
    .slice(0, options.limit);

// Για ilike: τα %, _ και \ ψάχνονται ως χαρακτήρες.
export const ilikePattern = (term: string): string =>
  `%${term.replace(/[\\%_]/g, (char) => `\\${char}`)}%`;
