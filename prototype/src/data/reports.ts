// Φανταστικά δεδομένα του module «14 Αναφορές»: ο κατάλογος των έτοιμων Αναφορών του v1, οι περίοδοι,
// οι ημερομηνίες των Ευκαιριών και τα σύνολα δεδομένων της Εξαγωγής (M2).
// Οι Αναφορές δεν έχουν δικά τους δεδομένα: διαβάζουν Τιμολόγια, Εισπράξεις και Ευκαιρίες.
// Στο v1 δεν υπάρχει builder αναφορών. Ό,τι άλλο χρειάζεται βγαίνει με Εξαγωγή.
// Πηγές: κεφ. 2 «Αναφορές: λεπτομέρειες κανόνων», κεφ. 1 (Δικαιώματα «Βλέπει Αναφορές», «Εξάγει δεδομένα»).

export type ReportFamily = "οικονομικές" | "πωλήσεις";

export type ReportId =
  "turnover" | "by-client" | "receivables" | "pipeline" | "results" | "sources";

export interface ReportDef {
  id: ReportId;
  family: ReportFamily;
  title: string;
  answers: string;
  basis: string;
  usesPeriod: boolean;
}

export const REPORTS: readonly ReportDef[] = [
  {
    id: "turnover",
    family: "οικονομικές",
    title: "Τζίρος και Εισπράξεις ανά μήνα",
    answers: "Πόσα τιμολογήσαμε και πόσα μπήκαν, κάθε μήνα.",
    basis:
      "Τζίρος: καθαρά ποσά Τιμολογίων μείον πιστωτικά, κατά ημερομηνία έκδοσης. Εισπράξεις: ποσά με ΦΠΑ, κατά ημερομηνία είσπραξης. Δεν προστίθενται ούτε αφαιρούνται μεταξύ τους.",
    usesPeriod: true,
  },
  {
    id: "by-client",
    family: "οικονομικές",
    title: "Τζίρος ανά Πελάτη",
    answers: "Από ποιους Πελάτες έρχεται ο Τζίρος της περιόδου.",
    basis:
      "Καθαρά ποσά Τιμολογίων μείον πιστωτικά, κατά ημερομηνία έκδοσης, με μερίδιο στο σύνολο.",
    usesPeriod: true,
  },
  {
    id: "receivables",
    family: "οικονομικές",
    title: "Οφειλές κατά ηλικία",
    answers: "Ποιος χρωστά, πόσα, και πόσο καιρό είναι ληξιπρόθεσμα.",
    basis:
      "Το ανεξόφλητο υπόλοιπο κάθε Τιμολογίου (με ΦΠΑ) σήμερα, σε κουτιά από την ημερομηνία λήξης. Δεν έχει περίοδο: δείχνει πάντα τη σημερινή εικόνα.",
    usesPeriod: false,
  },
  {
    id: "pipeline",
    family: "πωλήσεις",
    title: "Ανοιχτές Ευκαιρίες ανά Στάδιο",
    answers: "Τι έχουμε στα σκαριά και πόσο αξίζει.",
    basis:
      "Οι ανοιχτές Ευκαιρίες σήμερα. Αξία = το σύνολο της τελευταίας πρότασης, χωριστά η μηνιαία και η εφάπαξ. Δεν έχει περίοδο.",
    usesPeriod: false,
  },
  {
    id: "results",
    family: "πωλήσεις",
    title: "Κερδισμένες και χαμένες",
    answers: "Πόσες Ευκαιρίες κλείσαμε, πόσες χάσαμε και γιατί.",
    basis:
      "Οι Ευκαιρίες που πήραν Έκβαση μέσα στην περίοδο, κατά ημερομηνία Έκβασης. Ποσοστό επιτυχίας = κερδισμένες / (κερδισμένες + χαμένες).",
    usesPeriod: true,
  },
  {
    id: "sources",
    family: "πωλήσεις",
    title: "Πηγές Ευκαιριών",
    answers: "Από πού έρχονται οι Ευκαιρίες και ποιες πηγές φέρνουν δουλειά.",
    basis:
      "Οι Ευκαιρίες που άνοιξαν μέσα στην περίοδο, ανά Πηγή, με όσες από αυτές κερδήθηκαν ως σήμερα.",
    usesPeriod: true,
  },
];

export const findReport = (id: string | undefined): ReportDef | undefined =>
  REPORTS.find((report) => report.id === id);

// Οι έτοιμες περίοδοι. Δεν υπάρχει ελεύθερο εύρος ημερομηνιών στο v1: για κάτι άλλο, Εξαγωγή.
export type PeriodId =
  "this-month" | "last-month" | "this-quarter" | "this-year" | "last-year";

export const PERIODS: readonly { id: PeriodId; label: string }[] = [
  { id: "this-month", label: "Αυτός ο μήνας" },
  { id: "last-month", label: "Προηγούμενος μήνας" },
  { id: "this-quarter", label: "Αυτό το τρίμηνο" },
  { id: "this-year", label: "Φέτος" },
  { id: "last-year", label: "Πέρυσι" },
];

export const DEFAULT_PERIOD: PeriodId = "this-year";

// Πότε άνοιξε και πότε πήρε Έκβαση κάθε Ευκαιρία του module «Πελάτες και Πωλήσεις».
export const OPPORTUNITY_DATES: Readonly<
  Record<string, { opened: string; closed?: string }>
> = {
  "o-renewal": { opened: "2026-09-19" },
  "o-kypseli-social": { opened: "2026-06-05", closed: "2026-06-24" },
  "o-launch": { opened: "2026-09-17" },
  "o-kinisi": { opened: "2026-09-11" },
  "o-meli": { opened: "2026-08-20" },
  "o-armyra": { opened: "2026-09-10" },
  "o-athina": { opened: "2026-07-20", closed: "2026-08-27" },
  "o-armyra-lost": { opened: "2026-06-02", closed: "2026-07-30" },
  "o-athinaion": { opened: "2026-09-19" },
  "o-hamogelo": { opened: "2026-09-20" },
};

// Παλαιότερες κλεισμένες Ευκαιρίες. Στο prototype υπάρχουν μόνο για να έχουν οι Αναφορές πωλήσεων ιστορικό.
export interface PastOpportunity {
  id: string;
  clientName: string;
  title: string;
  ownerId: string;
  source: string;
  outcome: "Κερδισμένη" | "Χαμένη";
  lostReason?: string;
  kind: "μηνιαία" | "εφάπαξ";
  value: number;
  opened: string;
  closed: string;
}

export const PAST_OPPORTUNITIES: readonly PastOpportunity[] = [
  {
    id: "p-kinisi-social",
    clientName: "Γυμναστήριο Κίνηση",
    title: "Πακέτο social",
    ownerId: "anna",
    source: "Σύσταση",
    outcome: "Κερδισμένη",
    kind: "μηνιαία",
    value: 1300,
    opened: "2026-03-02",
    closed: "2026-03-25",
  },
  {
    id: "p-armyra-video",
    clientName: "Ταβέρνα Αρμύρα",
    title: "Βίντεο εστιατορίου",
    ownerId: "nikos",
    source: "Ιστοσελίδα",
    outcome: "Κερδισμένη",
    kind: "εφάπαξ",
    value: 2200,
    opened: "2025-04-02",
    closed: "2025-05-12",
  },
  {
    id: "p-orea-lost",
    clientName: "Κομμωτήριο Ωραία",
    title: "Reels για εγκαίνια",
    ownerId: "anna",
    source: "Instagram",
    outcome: "Χαμένη",
    lostReason: "Δεν απάντησε",
    kind: "εφάπαξ",
    value: 450,
    opened: "2026-06-15",
    closed: "2026-08-05",
  },
  {
    id: "p-nautilos-lost",
    clientName: "Ιστιοπλοϊκός Ναυτίλος",
    title: "Πακέτο podcast",
    ownerId: "nikos",
    source: "Facebook",
    outcome: "Χαμένη",
    lostReason: "Επέλεξε άλλον",
    kind: "μηνιαία",
    value: 700,
    opened: "2026-07-01",
    closed: "2026-08-22",
  },
  {
    id: "p-astro-lost",
    clientName: "Βιβλιοπωλείο Άστρο",
    title: "Βίντεο παρουσίασης",
    ownerId: "nikos",
    source: "Ιστοσελίδα",
    outcome: "Χαμένη",
    lostReason: "Τιμή",
    kind: "εφάπαξ",
    value: 800,
    opened: "2025-09-10",
    closed: "2025-10-15",
  },
];

// Τα σύνολα δεδομένων της Εξαγωγής (M2). «needs» = το Δικαίωμα που χρειάζεται, πέρα από το «Εξάγει δεδομένα».
export type ExportNeed = "clients" | "agreements" | "finance" | "cost";

export type DatasetId =
  | "invoices"
  | "receipts"
  | "billables"
  | "ledger"
  | "clients"
  | "agreements"
  | "expenses"
  | "profitability";

export interface ExportDataset {
  id: DatasetId;
  label: string;
  rows: string;
  columns: readonly string[];
  needs: ExportNeed;
  usesPeriod: boolean;
}

export const EXPORT_DATASETS: readonly ExportDataset[] = [
  {
    id: "invoices",
    label: "Τιμολόγια",
    rows: "ένα Τιμολόγιο, απόδειξη ή πιστωτικό ανά γραμμή",
    columns: [
      "Αριθμός",
      "Είδος",
      "Πελάτης",
      "ΑΦΜ",
      "Έκδοση",
      "Λήξη",
      "Καθαρό",
      "ΦΠΑ",
      "Σύνολο",
      "ΜΑΡΚ",
      "Κατάσταση",
      "Υπόλοιπο",
      "Αρχείο PDF",
    ],
    needs: "finance",
    usesPeriod: true,
  },
  {
    id: "receipts",
    label: "Εισπράξεις",
    rows: "μία Είσπραξη ανά γραμμή",
    columns: ["Ημερομηνία", "Πελάτης", "ΑΦΜ", "Ποσό", "Τρόπος", "Σημείωση"],
    needs: "finance",
    usesPeriod: true,
  },
  {
    id: "billables",
    label: "Τιμολογητέα",
    rows: "ένα Τιμολογητέο ανά γραμμή, με την κάλυψή του",
    columns: [
      "Ημερομηνία",
      "Πελάτης",
      "Συμφωνία",
      "Αιτία",
      "Περιγραφή",
      "Καθαρό",
      "Καλύφθηκε",
      "Προς τιμολόγηση",
    ],
    needs: "finance",
    usesPeriod: true,
  },
  {
    id: "ledger",
    label: "Καρτέλες Πελατών",
    rows: "μία κίνηση ανά γραμμή, ένα φύλλο ανά Πελάτη",
    columns: ["Ημερομηνία", "Κίνηση", "Χρέωση", "Πίστωση", "Υπόλοιπο"],
    needs: "finance",
    usesPeriod: true,
  },
  {
    id: "clients",
    label: "Πελάτες",
    rows: "ένας Πελάτης ανά γραμμή",
    columns: [
      "Επωνυμία",
      "ΑΦΜ",
      "ΔΟΥ",
      "Διεύθυνση",
      "Email",
      "Τηλέφωνο",
      "Κατάσταση",
      "Υπεύθυνος",
    ],
    needs: "clients",
    usesPeriod: false,
  },
  {
    id: "agreements",
    label: "Συμφωνίες",
    rows: "μία Συμφωνία ανά γραμμή",
    columns: [
      "Πελάτης",
      "Τίτλος",
      "Είδος",
      "Κατάσταση",
      "Έναρξη",
      "Λήξη",
      "Μηνιαία τιμή",
      "Εφάπαξ τιμή",
      "Υπογράφων",
    ],
    needs: "agreements",
    usesPeriod: false,
  },
  {
    id: "expenses",
    label: "Έξοδα ανά μήνα",
    rows: "ένα έξοδο ανά γραμμή, με κατηγορία και μήνα",
    columns: ["Μήνας", "Κατηγορία", "Στοιχείο", "Ποσό"],
    needs: "cost",
    usesPeriod: true,
  },
  {
    id: "profitability",
    label: "Κερδοφορία ανά Παραγωγή",
    rows: "μία Παραγωγή ανά γραμμή",
    columns: [
      "Παραγωγή",
      "Πελάτης",
      "Μήνας",
      "Τιμή",
      "Εκτιμώμενο κόστος",
      "Πραγματικό κόστος",
      "Περιθώριο",
    ],
    needs: "cost",
    usesPeriod: true,
  },
];

export type ExportFormat = "xlsx" | "csv";

export const EXPORT_FORMATS: readonly {
  id: ExportFormat;
  label: string;
  hint: string;
}[] = [
  {
    id: "xlsx",
    label: "Excel (.xlsx)",
    hint: "Ποσά ως αριθμοί, ημερομηνίες ως ημερομηνίες, ελληνικοί τίτλοι στηλών.",
  },
  {
    id: "csv",
    label: "CSV",
    hint: "UTF-8 με BOM και «;» ως διαχωριστικό, για να ανοίγει σωστά στο ελληνικό Excel. Ένα αρχείο ανά φύλλο, σε .zip.",
  },
];

// Ιστορικό εξαγωγών: γράφεται και στο Ίχνος ενεργειών (ποιος, τι, πότε, με ποια φίλτρα).
export interface ExportLogEntry {
  id: string;
  when: string;
  by: string;
  what: string;
  rows: number;
}

export const EXPORT_LOG: readonly ExportLogEntry[] = [
  {
    id: "x-3",
    when: "2026-09-02T10:14",
    by: "Ελένη Ρήγα (Λογιστής)",
    what: "Πακέτο λογιστή · Αύγουστος 2026",
    rows: 9,
  },
  {
    id: "x-2",
    when: "2026-08-03T09:40",
    by: "Ελένη Ρήγα (Λογιστής)",
    what: "Πακέτο λογιστή · Ιούλιος 2026",
    rows: 5,
  },
  {
    id: "x-1",
    when: "2026-07-21T17:05",
    by: "Γιώργος Μαυρίδης (Ιδιοκτήτης)",
    what: "Πελάτες · Excel",
    rows: 7,
  },
];
