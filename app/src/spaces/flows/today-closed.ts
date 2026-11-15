// «Τι έκλεισα σήμερα» από το Ίχνος (audit_trail), όχι από τον browser: μόνο ό,τι έκανα εγώ σήμερα (ώρα Αθήνας) και
// έβγαλε κάτι από τη λίστα. Καθαρό αρχείο. Ένα πράγμα = μία γραμμή, όσες αλλαγές κι αν έγιναν πάνω του.

export interface AuditEntry {
  id: number;
  at: string;
  action: "insert" | "update" | "delete" | "event";
  entity: string;
  entityLabel: string;
  entityId: string | null;
  subject: string | null;
  before: unknown;
  after: unknown;
}

export interface ClosedItem {
  key: string;
  title: string;
  at: number;
}

type Fields = Record<string, unknown>;

const fieldsOf = (value: unknown): Fields =>
  value !== null && typeof value === "object" ? (value as Fields) : {};

const isEmpty = (value: unknown): boolean =>
  value === null || value === undefined;

// Ένα πεδίο που ήταν άδειο και γέμισε (π.χ. done_at): η δουλειά έκλεισε.
const filled =
  (field: string) =>
  (before: Fields, after: Fields): boolean =>
    isEmpty(before[field]) && !isEmpty(after[field]);

// Ένα πεδίο που έφυγε από μια τιμή (π.χ. state «open»): η εκκρεμότητα έκλεισε.
const leftValue =
  (field: string, value: string) =>
  (before: Fields, after: Fields): boolean =>
    before[field] === value && after[field] !== value;

interface Rule {
  word: string;
  isClosing: (before: Fields, after: Fields) => boolean;
}

// Οι αλλαγές που κλείνουν γραμμή της λίστας, ανά πίνακα.
const UPDATES: Readonly<Record<string, Rule>> = {
  message_requests: { word: "Αίτημα", isClosing: leftValue("state", "open") },
  filmings: { word: "Γύρισμα", isClosing: leftValue("state", "pending") },
  agreements: {
    word: "Πρόταση προς έγκριση",
    isClosing: leftValue("path", "awaiting_approval"),
  },
  production_tasks: { word: "Εργασία", isClosing: filled("done_at") },
  deliverable_versions: {
    word: "Έκδοση",
    isClosing: leftValue("state", "in_review"),
  },
  google_deletions: {
    word: "Διαγραφή Google",
    isClosing: filled("resolved_at"),
  },
  deliverable_requests: {
    word: "Αίτημα αλλαγής",
    isClosing: filled("decided_at"),
  },
  gdpr_requests: { word: "Αίτημα GDPR", isClosing: filled("completed_on") },
};

// Ό,τι νέο φτιάχνεται και κλείνει κάτι: Απόδειξη, Τιμολόγιο, επιβεβαίωση ετοιμότητας.
const INSERTS: Readonly<Record<string, string>> = {
  receipts: "Απόδειξη",
  invoices: "Τιμολόγιο",
  readiness_confirmations: "Έλεγχος ετοιμότητας",
};

const filmingWord = (after: Fields): string =>
  after.state === "rejected" ? "Γύρισμα απορρίφθηκε" : "Γύρισμα εγκρίθηκε";

const wordOf = (entry: AuditEntry): string | null => {
  if (entry.action === "insert") return INSERTS[entry.entity] ?? null;
  if (entry.action !== "update") return null;
  const rule = UPDATES[entry.entity];
  const before = fieldsOf(entry.before);
  const after = fieldsOf(entry.after);
  if (!rule || !rule.isClosing(before, after)) return null;
  return entry.entity === "filmings" ? filmingWord(after) : rule.word;
};

const closedOfEntry = (entry: AuditEntry): ClosedItem | null => {
  const word = wordOf(entry);
  if (!word) return null;
  return {
    key: `${entry.entity}:${entry.entityId ?? entry.id}`,
    title: `${word}: ${entry.subject ?? entry.entityLabel}`,
    at: Date.parse(entry.at),
  };
};

// Τα κλεισίματα από dayStart και μετά, νεότερο πρώτο, ένα ανά πράγμα.
export const closedOf = (
  entries: readonly AuditEntry[],
  dayStart: number,
): ClosedItem[] => {
  const byKey = new Map<string, ClosedItem>();
  entries
    .flatMap((entry) => closedOfEntry(entry) ?? [])
    .filter((item) => item.at >= dayStart)
    .forEach((item) => {
      const kept = byKey.get(item.key);
      if (!kept || item.at > kept.at) byKey.set(item.key, item);
    });
  return [...byKey.values()].sort((a, b) => b.at - a.at);
};
