// Φανταστικά δεδομένα του Ελέγχου ετοιμότητας (O7): γραμμές πριν το άνοιγμα σε πελάτες.
// Πηγές: κεφ. 5 «Έλεγχος ετοιμότητας», απόφαση 4 και 6 του bundle.

export interface ReadinessLine {
  id: string;
  what: string;
  who: string;
  // Οθόνη όπου συμπληρώνεται· null όταν δεν υπάρχει (π.χ. τελικές τιμές ταυτότητας).
  screen: string | null;
  // Θέλει επιβεβαίωση από τον Ιδιοκτήτη (δεν αρκεί να συμπληρωθεί).
  isManual: boolean;
  // Η σημερινή κατάσταση (το σύστημα είναι ανοιχτό σε πελάτες από 15/06/2026).
  isReady: boolean;
  note?: string;
}

export const READINESS_LINES: readonly ReadinessLine[] = [
  { id: "company", what: "Στοιχεία εταιρείας", who: "Διαχείριση", screen: "O1", isManual: false, isReady: true },
  { id: "tax", what: "Φορολογικά στοιχεία", who: "Ιδιοκτήτης", screen: "O1", isManual: false, isReady: true },
  { id: "banks", what: "Λογαριασμοί τραπέζης", who: "Ιδιοκτήτης", screen: "O1", isManual: false, isReady: true },
  { id: "hours", what: "Ωράριο κρατήσεων", who: "Διαχείριση", screen: "O4", isManual: false, isReady: true },
  {
    id: "legal",
    what: "Νομικά κείμενα",
    who: "Ιδιοκτήτης (επιβεβαίωση)",
    screen: null,
    isManual: true,
    isReady: true,
    note: "Σχέδιο από τον developer· περιμένουν έγκριση από τον δικηγόρο. Δημοσιεύονται στις Νομικές σελίδες (R8).",
  },
  { id: "catalogue", what: "Κατάλογος", who: "Διαχείριση", screen: "C1", isManual: false, isReady: true },
  {
    id: "cost",
    what: "Πρώτος μήνας κόστους ώρας",
    who: "Όποιος «Διαχειρίζεται κόστος»",
    screen: "O6",
    isManual: false,
    isReady: true,
    note: "Δεν έχουν μπει ακόμα τα έξοδα του πρώτου μήνα (Ιούλιος 2026).",
  },
  { id: "kb", what: "Άρθρα Γνώσης", who: "Διαχείριση", screen: "L1", isManual: false, isReady: true },
  {
    id: "identity",
    what: "Τελικές τιμές ταυτότητας",
    who: "Ιδιοκτήτης (επιβεβαίωση)",
    screen: null,
    isManual: true,
    isReady: true,
    note: "Χρώματα και λογότυπο: τα δίνει ο developer, τα εγκρίνει ο Ιδιοκτήτης.",
  },
  { id: "texts", what: "Αρχικά κείμενα Αυτοματισμών και Μηνυμάτων συστήματος", who: "Ιδιοκτήτης (επιβεβαίωση)", screen: "K1", isManual: true, isReady: true },
];

// Η όψη «πριν το άνοιγμα» (O7): ό,τι εκκρεμούσε την ημέρα πριν πατηθεί το «Άνοιγμα σε πελάτες».
export const PENDING_BEFORE_OPENING: readonly string[] = ["legal", "cost", "identity"];

export const READY_DEFAULTS: readonly string[] = [
  "Στάδια Ευκαιρίας",
  "Πηγές Ευκαιριών",
  "Κανόνες Γυρισμάτων και Παραδοτέων",
  "ΦΠΑ 24%",
  "Δύο σετ Όρων Συμφωνίας",
  "Αρχικοί Αυτοματισμοί",
];

export const BLOCKED_BEFORE_OPENING: readonly string[] = [
  "Προσκλήσεις Χρηστών πελάτη (με το χέρι ή αυτόματα μετά την υπογραφή)",
  "Κάθε email προς πελάτες και Επαφές",
  "Αποστολή πρότασης για Έγκριση",
  "Οι δημόσιες φόρμες της Ιστοσελίδας (ενδιαφέρον, κράτηση, widget)",
];

export interface QueuedItem {
  id: string;
  label: string;
}

// Όσα θα έφευγαν με το άνοιγμα: μόνο Χρήστες πελάτη που δεν ήταν ήδη μέλη (Συμφωνίες που υπογράφηκαν πριν το άνοιγμα).
export const OPENING_QUEUE: readonly QueuedItem[] = [
  { id: "inv1", label: "Πρόσκληση Χρήστη: stavros@example.com (Γυμναστήριο Κίνηση)" },
  { id: "inv2", label: "Πρόσκληση Χρήστη: kostas@example.com (Ταβέρνα Αρμύρα)" },
  { id: "mail1", label: "Email «Καλώς ήρθες» προς Γυμναστήριο Κίνηση" },
];
