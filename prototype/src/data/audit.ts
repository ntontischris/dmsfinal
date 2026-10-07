// Το Ίχνος ενεργειών (P1): μόνο προσθήκη, ποιος, πότε, πριν → μετά. Φανταστικά στοιχεία.
// Οι γραμμές με ποσό ή κόστος κρύβουν τις τιμές από όποιον δεν έχει το αντίστοιχο Δικαίωμα.
// Πηγές: ADR 0018, κεφ. 5 «Ιστορικό».

export type AuditArea =
  | "settings-company"
  | "settings-sales"
  | "settings-agreements"
  | "settings-filming"
  | "settings-deliverables"
  | "settings-finance"
  | "team"
  | "agreements"
  | "finance"
  | "filming"
  | "deliverables"
  | "health"
  | "exports";

export const AREA_LABELS: Readonly<Record<AuditArea, string>> = {
  "settings-company": "Ρυθμίσεις › Εταιρεία",
  "settings-sales": "Ρυθμίσεις › Πωλήσεις",
  "settings-agreements": "Ρυθμίσεις › Συμφωνίες",
  "settings-filming": "Ρυθμίσεις › Γυρίσματα",
  "settings-deliverables": "Ρυθμίσεις › Παραδοτέα",
  "settings-finance": "Ρυθμίσεις › Οικονομικά",
  team: "Ομάδα και Πρόσβαση",
  agreements: "Συμφωνίες",
  finance: "Οικονομικά",
  filming: "Γυρίσματα",
  deliverables: "Παραδοτέα",
  health: "Υγεία συστήματος",
  exports: "Εξαγωγές",
};

export type AuditAction =
  "αλλαγή" | "προσθήκη" | "απόσυρση" | "διαγραφή" | "ενέργεια";

export interface AuditEntry {
  id: string;
  at: string; // "YYYY-MM-DD HH:MM", ώρα Ελλάδας
  actor: string; // όνομα Χρήστη ή «Σύστημα»
  area: AuditArea;
  subject: string;
  subjectHref?: string; // κωδικός οθόνης, π.χ. "O1"
  action: AuditAction;
  before?: string;
  after?: string;
  sensitivity?: "amount" | "cost";
}

export const AUDIT: readonly AuditEntry[] = [
  {
    id: "a14",
    at: "2026-09-20 10:12",
    actor: "Δημήτρης Ιωάννου",
    area: "settings-sales",
    subject: "Ισχύς πρότασης",
    subjectHref: "O2",
    action: "αλλαγή",
    before: "14 μέρες",
    after: "21 μέρες",
  },
  {
    id: "a13",
    at: "2026-09-19 17:40",
    actor: "Σύστημα",
    area: "health",
    subject: "Αποστολή «Τιμολόγιο εκδόθηκε» προς Ζαχαροπλαστείο Μέλι",
    subjectHref: "P2",
    action: "ενέργεια",
    after: "απέτυχε οριστικά (όριο αποστολών)",
  },
  {
    id: "a12",
    at: "2026-09-19 12:05",
    actor: "Γιώργος Μαυρίδης",
    area: "settings-company",
    subject: "Προεπιλεγμένος λογαριασμός τραπέζης",
    subjectHref: "O1",
    action: "αλλαγή",
    before: "GR16 0110 … 7890 (Τράπεζα Α)",
    after: "GR27 0260 … 3141 (Τράπεζα Β)",
  },
  {
    id: "a11",
    at: "2026-09-18 15:22",
    actor: "Δημήτρης Ιωάννου",
    area: "settings-sales",
    subject: "Πηγή «Instagram»",
    subjectHref: "O2",
    action: "αλλαγή",
    before: "Instagram",
    after: "Instagram και Facebook",
  },
  {
    id: "a10",
    at: "2026-09-18 09:30",
    actor: "Γιώργος Μαυρίδης",
    area: "settings-finance",
    subject: "Αναμενόμενες παραγωγικές ώρες του μήνα",
    subjectHref: "O6",
    action: "αλλαγή",
    before: "352 ώρες",
    after: "320 ώρες",
    sensitivity: "cost",
  },
  {
    id: "a9",
    at: "2026-09-17 11:10",
    actor: "Δημήτρης Ιωάννου",
    area: "settings-filming",
    subject: "Αργία «Δεκαπενταύγουστος»",
    subjectHref: "O4",
    action: "αλλαγή",
    before: "κλειστή",
    after: "ανοιχτή ως εξαίρεση",
  },
  {
    id: "a8",
    at: "2026-09-16 16:48",
    actor: "Δημήτρης Ιωάννου",
    area: "agreements",
    subject: "Συμφωνία «Κυψέλη Social, μηνιαία»",
    subjectHref: "D2",
    action: "αλλαγή",
    before: "τιμή Περιόδου 900 €",
    after: "τιμή Περιόδου 950 €",
    sensitivity: "amount",
  },
  {
    id: "a7",
    at: "2026-09-15 10:00",
    actor: "Δημήτρης Ιωάννου",
    area: "settings-agreements",
    subject: "Όριο ακύρωσης (προεπιλογή μηνιαίων)",
    subjectHref: "O3",
    action: "αλλαγή",
    before: "48 ώρες",
    after: "24 ώρες",
  },
  {
    id: "a6",
    at: "2026-09-14 13:15",
    actor: "Δημήτρης Ιωάννου",
    area: "settings-deliverables",
    subject: "Προθεσμία Παραδοτέου «reel»",
    subjectHref: "O5",
    action: "αλλαγή",
    before: "7 εργάσιμες",
    after: "5 εργάσιμες",
  },
  {
    id: "a5",
    at: "2026-09-12 09:05",
    actor: "Γιώργος Μαυρίδης",
    area: "team",
    subject: "Ρόλος «Παραγωγή»",
    subjectHref: "N4",
    action: "αλλαγή",
    before: "Δεσμεύει εξοπλισμό: —",
    after: "Δεσμεύει εξοπλισμό: Α",
  },
  {
    id: "a4",
    at: "2026-09-10 18:20",
    actor: "Ελένη Ρήγα",
    area: "exports",
    subject: "Πακέτο λογιστή, Αύγουστος 2026",
    subjectHref: "M2",
    action: "ενέργεια",
    after: "εξαγωγή σε Excel",
  },
  {
    id: "a3",
    at: "2026-09-08 12:00",
    actor: "Δημήτρης Ιωάννου",
    area: "settings-sales",
    subject: "Λόγος απώλειας «Δοκιμαστικό»",
    subjectHref: "O2",
    action: "διαγραφή",
    before: "Δοκιμαστικό (δεν χρησιμοποιήθηκε)",
  },
  {
    id: "a2",
    at: "2026-09-05 10:30",
    actor: "Δημήτρης Ιωάννου",
    area: "finance",
    subject: "Είσπραξη Τιμολογίου 2026-041",
    subjectHref: "I3",
    action: "προσθήκη",
    after: "1.178,00 € με τραπεζική μεταφορά",
    sensitivity: "amount",
  },
  {
    id: "a1",
    at: "2026-09-01 08:00",
    actor: "Ανωνυμοποιημένος Χρήστης",
    area: "team",
    subject: "Χρήστης ομάδας",
    subjectHref: "N1",
    action: "ενέργεια",
    after: "απενεργοποιήθηκε",
  },
];

export const auditOfArea = (area: AuditArea): readonly AuditEntry[] =>
  AUDIT.filter((entry) => entry.area === area);
