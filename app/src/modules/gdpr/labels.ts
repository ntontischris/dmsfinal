import type { Tone } from "@/components/ui/badge";

import type {
  AnonymizeBlock,
  GdprKind,
  GdprRequest,
  SubjectKind,
} from "./schemas";

// Τα ελληνικά κείμενα των Αιτημάτων GDPR (Νβ #208), κατά το prototype (n1-gdpr, n2-gdpr).

export const GDPR_TITLE = "Αιτήματα GDPR";
export const GDPR_EYEBROW = "N1 · Ομάδα και Πρόσβαση";
export const GDPR_PATH = "/app/team/gdpr";
export const GDPR_OWNER_ONLY = "μόνο ο Ιδιοκτήτης";
export const GDPR_NO_ACCESS =
  "Τα Αιτήματα GDPR τα βλέπει μόνο ο Ιδιοκτήτης. Δεν είναι Δικαίωμα και δεν δίνεται σε κανέναν Ρόλο.";
export const GDPR_LOAD_ERROR =
  "Δεν φόρτωσαν τα Αιτήματα GDPR. Τίποτα δεν χάθηκε· δοκίμασε ξανά σε λίγο.";
export const GDPR_EMPTY =
  "Κανένα αίτημα. Κάθε αίτημα εξαγωγής ή ανωνυμοποίησης καταγράφεται εδώ.";
export const GDPR_NOTE =
  "Προθεσμία 1 μήνας από τη λήψη, σε ώρα Αθήνας. Η εξαγωγή για πρόσωπο γίνεται από τη σελίδα του Χρήστη· για Πελάτη ολόκληρο, από τη σελίδα του Πελάτη.";

export const KIND_LABEL: Readonly<Record<GdprKind, string>> = {
  export: "Εξαγωγή",
  anonymize: "Ανωνυμοποίηση",
};

export const SUBJECT_KIND_LABEL: Readonly<Record<SubjectKind, string>> = {
  team_user: "Χρήστης ομάδας",
  client_user: "Χρήστης πελάτη",
  contact: "Επαφή",
  client: "Πελάτης",
};

// Ίδια κείμενα με το authz.gdpr_block_text της βάσης.
export const BLOCK_TEXT: Readonly<Record<AnonymizeBlock, string>> = {
  not_found: "Το πρόσωπο δεν βρέθηκε.",
  anonymized: "Έχει ήδη ανωνυμοποιηθεί.",
  active:
    "Ανωνυμοποιείται μόνο απενεργοποιημένος Χρήστης ομάδας. Πρώτα Απενεργοποίηση.",
  member:
    "Ο Χρήστης πελάτη ανήκει ακόμη σε Πελάτη. Πρώτα αφαίρεση από κάθε Πελάτη.",
  contact_is_user:
    "Η Επαφή είναι και ενεργός Χρήστης πελάτη. Πρώτα αφαίρεση από τον Πελάτη.",
  archived:
    "Ο Πελάτης έχει συγχωνευθεί· η Επαφή του ζει στον Πελάτη που κράτησες.",
  kind: "Ο Πελάτης ως επιχείρηση δεν ανωνυμοποιείται.",
};

export const ERASED_TEXT =
  "όνομα (γίνεται «Ανωνυμοποιημένος Χρήστης N»), email, τηλέφωνο, προτιμήσεις, Σύνδεσμος ημερολογίου, Συζητήσεις με τον Βοηθό· η διεύθυνση κρύβεται στο Ιστορικό αποστολών. Ο λογαριασμός δεν μπαίνει ποτέ ξανά.";
export const KEPT_TEXT =
  "Μηνύματα και Ίχνος (με το νέο όνομα), υπογεγραμμένες Συμφωνίες και Τιμολόγια (νομική υποχρέωση διατήρησης, δεν αλλάζουν).";
export const ZIP_NOTE =
  "Ένα ZIP με JSON, CSV και τα PDF των Τιμολογίων· χωρίς Εσωτερικά Μηνύματα. Κάθε εξαγωγή γράφεται στο Ίχνος.";

export const EXPORT_FAILED = "Η εξαγωγή δεν έγινε. Δοκίμασε ξανά σε λίγο.";
export const EXPORT_WORKING = "Ετοιμάζεται…";
export const exportDone = (missing: number): string =>
  missing === 0
    ? "Το ZIP κατέβηκε."
    : `Το ZIP κατέβηκε. ${missing === 1 ? "Ένα Τιμολόγιο δεν έχει" : `${missing} Τιμολόγια δεν έχουν`} PDF· γράφεται στο ΔΙΑΒΑΣΕ.txt.`;

// Ημερομηνία «YYYY-MM-DD» → «dd/mm/yyyy».
export const fmtDay = (iso: string): string => {
  const [year, month, day] = iso.slice(0, 10).split("-");
  return `${day}/${month}/${year}`;
};

// Το σήμα του αιτήματος: ολοκληρώθηκε, έληξε, ή πόσες μέρες μένουν (από τη βάση, σε ώρα Αθήνας).
export function deadlineBadge(
  request: Pick<GdprRequest, "completedOn" | "daysLeft">,
): { text: string; tone?: Tone } {
  if (request.completedOn)
    return { text: `ολοκληρώθηκε ${fmtDay(request.completedOn)}`, tone: "ok" };
  const days = request.daysLeft;
  if (days < 0) return { text: "έληξε", tone: "attention" };
  if (days === 0) return { text: "λήγει σήμερα", tone: "attention" };
  if (days === 1) return { text: "λήγει αύριο", tone: "attention" };
  return {
    text: `λήγει σε ${days} μέρες`,
    tone: days <= 7 ? "attention" : undefined,
  };
}

// Οι ενότητες της εξαγωγής: τίτλος αρχείου μέσα στο ZIP. Άγνωστη ενότητα κρατά το όνομά της.
export const SECTION_TITLES: Readonly<Record<string, string>> = {
  details: "Στοιχεία",
  users: "Χρήστες",
  memberships: "Συμμετοχές σε Πελάτες",
  roles: "Ρόλοι",
  agreements: "Συμφωνίες",
  agreementRoles: "Θέσεις σε Συμφωνίες",
  invoices: "Τιμολόγια",
  receipts: "Εισπράξεις",
  filmings: "Γυρίσματα",
  deliverables: "Παραδοτέα",
  messages: "Συνομιλία",
  assistant: "Συζητήσεις με τον Βοηθό",
};

// Οι τίτλοι στηλών των CSV. Άγνωστο κλειδί μένει όπως είναι.
export const COLUMN_TITLES: Readonly<Record<string, string>> = {
  name: "Όνομα",
  email: "Email",
  phone: "Τηλέφωνο",
  role: "Ρόλος",
  client: "Πελάτης",
  kind: "Είδος",
  title: "Τίτλος",
  state: "Κατάσταση",
  joinedAt: "Μπήκε",
  removedAt: "Αφαιρέθηκε",
  validUntil: "Ισχύει ως",
  startOn: "Έναρξη",
  endOn: "Λήξη",
  signedAt: "Υπογράφηκε",
  signedName: "Όνομα υπογραφής",
  signedOn: "Ημερομηνία υπογραφής",
  agreement: "Συμφωνία",
  isSignatory: "Υπογράφων",
  number: "Αριθμός",
  issueDate: "Έκδοση",
  dueDate: "Λήξη πληρωμής",
  net: "Καθαρό",
  vat: "ΦΠΑ",
  total: "Σύνολο",
  mark: "ΜΑΡΚ",
  voidedAt: "Ακυρώθηκε",
  pdfFile: "Αρχείο PDF",
  receivedOn: "Ημερομηνία",
  amount: "Ποσό",
  method: "Τρόπος",
  note: "Σημείωση",
  production: "Παραγωγή",
  startsAt: "Έναρξη",
  hours: "Ώρες",
  location: "Τοποθεσία",
  clientNote: "Σημείωση πελάτη",
  deadline: "Προθεσμία",
  approvedAt: "Εγκρίθηκε",
  version: "Έκδοση",
  link: "Link",
  sentAt: "Στάλθηκε",
  answeredAt: "Απάντηση",
  at: "Πότε",
  author: "Από",
  authorKind: "Πλευρά",
  body: "Κείμενο",
  editedAt: "Διορθώθηκε",
  conversation: "Συζήτηση",
  startedAt: "Ξεκίνησε",
  content: "Κείμενο",
};

export const MONEY_COLUMNS: ReadonlySet<string> = new Set([
  "net",
  "vat",
  "total",
  "amount",
]);

export const ZIP_FOLDER = "GDPR";
export const ZIP_README = "ΔΙΑΒΑΣΕ.txt";
export const ZIP_JSON = "δεδομένα.json";
export const ZIP_PDF_FOLDER = "Τιμολόγια PDF";
export const PDF_MISSING = {
  notFound: "το αρχείο δεν βρέθηκε στην αποθήκευση",
  failed: "το αρχείο δεν κατέβηκε",
} as const;
