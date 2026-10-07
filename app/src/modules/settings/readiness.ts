// Οι γραμμές του Ελέγχου ετοιμότητας (κεφ. 5): τι είναι, ποιος τις συμπληρώνει, πού.
// Το αν είναι «εκκρεμεί» το λέει η βάση (public.readiness)· εδώ μόνο οι λέξεις.

export interface ReadinessInfo {
  label: string;
  who: string;
  href?: string;
}

export const READINESS: Readonly<Record<string, ReadinessInfo>> = {
  company_details: {
    label: "Στοιχεία εταιρείας και Υπογράφων",
    who: "Διαχείριση",
    href: "/app/settings/company",
  },
  tax_details: {
    label: "ΑΦΜ, ΔΟΥ, ΓΕΜΗ",
    who: "Ιδιοκτήτης",
    href: "/app/settings/company",
  },
  bank_account: {
    label: "Λογαριασμός τραπέζης, με έναν προεπιλεγμένο",
    who: "Ιδιοκτήτης",
    href: "/app/settings/company",
  },
  logo: { label: "Λογότυπο", who: "Διαχείριση" },
  booking_hours: { label: "Ωράριο κρατήσεων", who: "Διαχείριση" },
  catalogue: {
    label: "Κατάλογος: Πακέτα, Υπηρεσίες, τιμές",
    who: "Διαχείριση",
  },
  costs: {
    label: "Έξοδα και ώρες: ο πρώτος μήνας Κόστους ώρας",
    who: "Όποιος «Διαχειρίζεται κόστος»",
  },
  knowledge: { label: "Άρθρα Γνώσης", who: "Όποιος διαχειρίζεται τη Γνώση" },
  legal_texts: {
    label: "Νομικά κείμενα, ελεγμένα από δικηγόρο",
    who: "Ιδιοκτήτης (επιβεβαίωση)",
  },
  identity_values: {
    label: "Τελικές τιμές ταυτότητας (χρώματα, γραμματοσειρές)",
    who: "Ιδιοκτήτης (επιβεβαίωση)",
  },
  automation_texts: {
    label: "Αρχικά κείμενα Αυτοματισμών και Μηνυμάτων συστήματος",
    who: "Ιδιοκτήτης (έγκριση στην K1)",
  },
};

// Γραμμές που θα συμπληρωθούν όταν χτιστεί το module τους.
const MODULES: Readonly<Record<string, string>> = {
  "module:files": "τα Αρχεία",
  "module:filming": "τα Γυρίσματα",
  "module:catalogue": "τον Κατάλογο",
  "module:finance": "τα Οικονομικά",
  "module:knowledge": "τη Γνώση",
  "module:automations": "τους Αυτοματισμούς",
};

export type ReadinessAction =
  { kind: "confirm" } | { kind: "module"; name: string } | { kind: "fill" };

export const actionOf = (note: string | null): ReadinessAction =>
  note === "confirm"
    ? { kind: "confirm" }
    : note && MODULES[note]
      ? { kind: "module", name: MODULES[note] }
      : { kind: "fill" };
