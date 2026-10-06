// Φανταστικά δεδομένα του module «10 Οικονομικά»: Τιμολογητέα, Τιμολόγια (και πιστωτικά), Εισπράξεις,
// τρόποι είσπραξης και Έξοδα ανά μήνα. Repo public: μόνο επινοημένα ονόματα, αριθμοί και ποσά.
// Τα ποσά των Τιμολογητέων είναι καθαρά (χωρίς ΦΠΑ)· Τιμολόγια και Εισπράξεις έχουν και ΦΠΑ.
// Πηγές: κεφ. 3.7, «Λεπτομέρειες κανόνων: Οικονομικά», κεφ. 3.3 (μοντέλο κόστους), ADR 0004, ADR 0017.

export type BillableReason =
  | "Περίοδος"
  | "ορόσημο"
  | "έξτρα Παραδοτέο"
  | "έξτρα αναθεώρηση"
  | "ρήτρα λύσης";

export interface Billable {
  id: string;
  clientId: string;
  agreementId: string;
  reason: BillableReason;
  label: string;
  date: string;
  net: number;
}

export type InvoiceKind = "τιμολόγιο" | "απόδειξη" | "πιστωτικό";

export interface Invoice {
  id: string;
  clientId: string;
  kind: InvoiceKind;
  number: string;
  issueDate: string;
  dueDate?: string;
  net: number;
  vat: number;
  total: number;
  mark?: string;
  creditFor?: string;
  pdf: string;
  registeredBy: string;
  registeredAt: string;
  // Ακύρωση καταχώρισης: λάθος στο DMS (π.χ. ανέβηκε δύο φορές). Λάθος στο ίδιο το τιμολόγιο = πιστωτικό.
  voided?: { by: string; when: string; reason: string };
  corrections?: readonly { by: string; when: string; what: string }[];
}

export interface Receipt {
  id: string;
  clientId: string;
  date: string;
  amount: number;
  methodId: string;
  note?: string;
  registeredBy: string;
}

// Λίστα του admin (Ρυθμίσεις › Οικονομικά). Ό,τι έχει χρησιμοποιηθεί αποσύρεται, δεν σβήνεται (ADR 0015).
export interface PaymentMethod {
  id: string;
  name: string;
  isActive: boolean;
}

export const PAYMENT_METHODS: readonly PaymentMethod[] = [
  { id: "bank", name: "Τραπεζική κατάθεση (IBAN)", isActive: true },
  { id: "rf", name: "Πληρωμή με κωδικό RF", isActive: true },
  { id: "cash", name: "Μετρητά", isActive: true },
  { id: "pos", name: "Κάρτα (POS)", isActive: true },
  { id: "cheque", name: "Επιταγή", isActive: false },
];

export const methodName = (id: string): string =>
  PAYMENT_METHODS.find((m) => m.id === id)?.name ?? "—";

// Στοιχεία πληρωμής της εταιρείας (τα αλλάζει μόνο ο Ιδιοκτήτης). Φανταστικά.
export const COMPANY_PAYMENT = {
  beneficiary: "Φανταστική Παραγωγές Ο.Ε.",
  bank: "Τράπεζα Παράδειγμα",
  iban: "GR00 0000 0000 0000 0000 0000 000",
};

// Υπενθύμιση για ανοιχτό Τιμολογητέο (Γεγονός 56): στις 7 και στις 14 μέρες.
export const BILLABLE_REMINDER_DAYS: readonly number[] = [7, 14];

export const BILLABLES: readonly Billable[] = [
  {
    id: "b-kyp-07",
    clientId: "kypseli",
    agreementId: "ag-kypseli-social",
    reason: "Περίοδος",
    label: "Περίοδος Ιούλιος 2026",
    date: "2026-07-01",
    net: 900,
  },
  {
    id: "b-kyp-08",
    clientId: "kypseli",
    agreementId: "ag-kypseli-social",
    reason: "Περίοδος",
    label: "Περίοδος Αύγουστος 2026",
    date: "2026-08-01",
    net: 900,
  },
  {
    id: "b-kyp-09",
    clientId: "kypseli",
    agreementId: "ag-kypseli-social",
    reason: "Περίοδος",
    label: "Περίοδος Σεπτέμβριος 2026",
    date: "2026-09-01",
    net: 900,
  },
  {
    id: "b-kin-08",
    clientId: "kinisi",
    agreementId: "ag-kinisi-social",
    reason: "Περίοδος",
    label: "Περίοδος Αύγουστος 2026",
    date: "2026-08-01",
    net: 1300,
  },
  {
    id: "b-kin-08x",
    clientId: "kinisi",
    agreementId: "ag-kinisi-social",
    reason: "έξτρα αναθεώρηση",
    label: "Έξτρα αναθεώρηση: Reel 4 (Αύγουστος)",
    date: "2026-08-25",
    net: 80,
  },
  {
    id: "b-kin-09",
    clientId: "kinisi",
    agreementId: "ag-kinisi-social",
    reason: "Περίοδος",
    label: "Περίοδος Σεπτέμβριος 2026",
    date: "2026-09-01",
    net: 1300,
  },
  {
    id: "b-ath-09",
    clientId: "athina",
    agreementId: "ag-athina-social",
    reason: "Περίοδος",
    label: "Περίοδος 5–30 Σεπτεμβρίου 2026 (αναλογικά)",
    date: "2026-09-05",
    net: 1014,
  },
  {
    id: "b-arm-1",
    clientId: "armyra",
    agreementId: "ag-armyra-2025",
    reason: "ορόσημο",
    label: "Δόση 50%: υπογραφή",
    date: "2025-05-12",
    net: 1100,
  },
  {
    id: "b-arm-2",
    clientId: "armyra",
    agreementId: "ag-armyra-2025",
    reason: "ορόσημο",
    label: "Δόση 50%: Παραγωγή παραδόθηκε",
    date: "2025-06-20",
    net: 1100,
  },
];

const vatOf = (net: number): number => Math.round(net * 24) / 100;

const invoice = (
  fields: Omit<
    Invoice,
    "vat" | "total" | "pdf" | "registeredBy" | "registeredAt"
  > &
    Partial<Pick<Invoice, "registeredAt">>,
): Invoice => ({
  ...fields,
  vat: vatOf(fields.net),
  total: fields.net + vatOf(fields.net),
  pdf: `${fields.number}.pdf`,
  registeredBy: "giorgos",
  registeredAt: fields.registeredAt ?? fields.issueDate,
});

export const INVOICES: readonly Invoice[] = [
  invoice({
    id: "inv-kyp-41",
    clientId: "kypseli",
    kind: "τιμολόγιο",
    number: "Α-41",
    issueDate: "2026-07-03",
    dueDate: "2026-07-18",
    net: 900,
    mark: "400000000000041",
  }),
  invoice({
    id: "inv-kyp-58",
    clientId: "kypseli",
    kind: "τιμολόγιο",
    number: "Α-58",
    issueDate: "2026-08-04",
    dueDate: "2026-08-19",
    net: 900,
    mark: "400000000000058",
  }),
  {
    ...invoice({
      id: "inv-kyp-58b",
      clientId: "kypseli",
      kind: "τιμολόγιο",
      number: "Α-58",
      issueDate: "2026-08-04",
      dueDate: "2026-08-19",
      net: 900,
    }),
    voided: {
      by: "giorgos",
      when: "2026-08-04",
      reason: "Ανέβηκε δύο φορές το ίδιο PDF.",
    },
  },
  invoice({
    id: "inv-kin-57",
    clientId: "kinisi",
    kind: "τιμολόγιο",
    number: "Α-57",
    issueDate: "2026-08-03",
    dueDate: "2026-08-18",
    net: 1300,
  }),
  invoice({
    id: "inv-kin-63",
    clientId: "kinisi",
    kind: "απόδειξη",
    number: "ΑΠΥ-63",
    issueDate: "2026-08-27",
    dueDate: "2026-09-11",
    net: 80,
  }),
  {
    ...invoice({
      id: "inv-kin-71",
      clientId: "kinisi",
      kind: "τιμολόγιο",
      number: "Α-71",
      issueDate: "2026-09-02",
      dueDate: "2026-09-17",
      net: 1400,
      mark: "400000000000071",
    }),
    corrections: [
      {
        by: "giorgos",
        when: "2026-09-02",
        what: "Ημερομηνία έκδοσης 02/09 αντί για 20/09 (λάθος ανάγνωση του PDF)",
      },
    ],
  },
  invoice({
    id: "inv-kin-72",
    clientId: "kinisi",
    kind: "πιστωτικό",
    number: "ΠΙΣ-72",
    issueDate: "2026-09-05",
    net: 100,
    creditFor: "inv-kin-71",
  }),
  invoice({
    id: "inv-ath-68",
    clientId: "athina",
    kind: "τιμολόγιο",
    number: "Α-68",
    issueDate: "2026-09-08",
    dueDate: "2026-09-23",
    net: 1014,
  }),
  invoice({
    id: "inv-arm-31",
    clientId: "armyra",
    kind: "τιμολόγιο",
    number: "Α-31",
    issueDate: "2025-05-14",
    dueDate: "2025-05-29",
    net: 1100,
  }),
  invoice({
    id: "inv-arm-49",
    clientId: "armyra",
    kind: "τιμολόγιο",
    number: "Α-49",
    issueDate: "2025-06-23",
    dueDate: "2025-07-08",
    net: 1100,
  }),
];

export const RECEIPTS: readonly Receipt[] = [
  {
    id: "r-kyp-1",
    clientId: "kypseli",
    date: "2026-07-15",
    amount: 1116,
    methodId: "bank",
    registeredBy: "dimitris",
  },
  {
    id: "r-kyp-2",
    clientId: "kypseli",
    date: "2026-08-28",
    amount: 500,
    methodId: "rf",
    note: "Μέρος του Αυγούστου",
    registeredBy: "dimitris",
  },
  {
    id: "r-kin-1",
    clientId: "kinisi",
    date: "2026-08-14",
    amount: 1612,
    methodId: "bank",
    registeredBy: "dimitris",
  },
  {
    id: "r-kin-2",
    clientId: "kinisi",
    date: "2026-09-01",
    amount: 99.2,
    methodId: "pos",
    registeredBy: "dimitris",
  },
  {
    id: "r-kin-3",
    clientId: "kinisi",
    date: "2026-09-15",
    amount: 1612,
    methodId: "bank",
    registeredBy: "giorgos",
  },
  {
    id: "r-ath-1",
    clientId: "athina",
    date: "2026-09-05",
    amount: 500,
    methodId: "cash",
    note: "Προκαταβολή στην υπογραφή",
    registeredBy: "giorgos",
  },
  {
    id: "r-arm-1",
    clientId: "armyra",
    date: "2025-05-20",
    amount: 1364,
    methodId: "bank",
    registeredBy: "dimitris",
  },
  {
    id: "r-arm-2",
    clientId: "armyra",
    date: "2025-07-01",
    amount: 1364,
    methodId: "cheque",
    registeredBy: "dimitris",
  },
];

// Έξοδα: κατηγορίες → έξοδα → υπο-γραμμές, ανά μήνα. Κόστος ώρας = σύνολο ÷ παραγωγικές ώρες.
export interface ExpenseItem {
  name: string;
  lines: readonly { label: string; amount: number }[];
}

export interface ExpenseCategory {
  name: string;
  items: readonly ExpenseItem[];
}

export interface MonthCost {
  month: string;
  productiveHours: number;
  categories: readonly ExpenseCategory[];
}

const BASE_CATEGORIES: readonly ExpenseCategory[] = [
  {
    name: "Ομάδα",
    items: [
      {
        name: "Μισθοδοσία",
        lines: [{ label: "Μισθοί και εισφορές", amount: 5600 }],
      },
      {
        name: "Εξωτερικοί συνεργάτες",
        lines: [{ label: "Λογιστής", amount: 300 }],
      },
    ],
  },
  {
    name: "Χώρος",
    items: [
      { name: "Ενοίκιο στούντιο", lines: [{ label: "Ενοίκιο", amount: 1200 }] },
      {
        name: "Λειτουργικά",
        lines: [
          { label: "Ρεύμα", amount: 180 },
          { label: "Internet και τηλέφωνα", amount: 120 },
        ],
      },
    ],
  },
  {
    name: "Εξοπλισμός και λογισμικό",
    items: [
      {
        name: "Αποσβέσεις εξοπλισμού",
        lines: [
          { label: "Κάμερες και φακοί", amount: 650 },
          { label: "Φωτισμός και ήχος", amount: 250 },
        ],
      },
      {
        name: "Συνδρομές λογισμικού",
        lines: [
          { label: "Μοντάζ και γραφικά", amount: 260 },
          { label: "Αποθήκευση και DMS", amount: 140 },
        ],
      },
    ],
  },
  {
    name: "Μετακινήσεις",
    items: [
      {
        name: "Καύσιμα και διόδια",
        lines: [{ label: "Αυτοκίνητο στούντιο", amount: 100 }],
      },
    ],
  },
];

export const MONTH_COSTS: readonly MonthCost[] = [
  { month: "2026-07", productiveHours: 220, categories: BASE_CATEGORIES },
  { month: "2026-08", productiveHours: 220, categories: BASE_CATEGORIES },
  { month: "2026-09", productiveHours: 220, categories: BASE_CATEGORIES },
  { month: "2026-10", productiveHours: 220, categories: BASE_CATEGORIES },
];
