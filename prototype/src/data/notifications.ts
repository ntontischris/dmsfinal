// Φανταστικά δεδομένα του module «12 Ειδοποιήσεις και Αυτοματισμοί»: ο σταθερός κατάλογος Γεγονότων,
// οι αρχικοί Αυτοματισμοί, οι μεταβλητές κειμένου, τα Μηνύματα συστήματος, το Ιστορικό αποστολών
// και οι Ειδοποιήσεις ανά Χρήστη. Repo public: μόνο επινοημένα ονόματα και διευθύνσεις.
// Πηγές: κεφ. 4 (και «Λεπτομέρειες κανόνων»), ADR 0006, ADR 0016, ADR 0018.

export type EventKind = "στιγμιαίο" | "με ημερομηνία" | "αναμονής";
export type Channel = "Ειδοποίηση" | "email";

export interface EventGroup {
  id: string;
  letter: string;
  title: string;
}

export const EVENT_GROUPS: readonly EventGroup[] = [
  { id: "sales", letter: "Α", title: "Πωλήσεις και Συμφωνίες" },
  { id: "filming", letter: "Β", title: "Περίοδοι και Γυρίσματα" },
  { id: "deliverables", letter: "Γ", title: "Παραδοτέα" },
  { id: "finance", letter: "Δ", title: "Οικονομικά και κόστος" },
  { id: "comms", letter: "Ε", title: "Επικοινωνία και πελάτες" },
  { id: "health", letter: "ΣΤ", title: "Υγεία συστήματος" },
];

// Πώς ορίζεται ένας παραλήπτης (κεφ. 4 «Παραλήπτες»).
export type Recipient =
  | { kind: "σχετικός"; label: string; isClient?: boolean }
  | { kind: "δικαίωμα"; permission: string }
  | { kind: "ονομαστικά"; personIds: readonly string[] }
  | { kind: "επισκέπτης" };

export type Timing =
  | { kind: "αμέσως" }
  | { kind: "ημερομηνία"; days: number; at: string }
  | { kind: "αναμονή"; after: number; unit: "λεπτά" | "ώρες" | "μέρες" };

export interface Automation {
  id: string;
  eventId: number;
  isActive: boolean;
  channel: Channel;
  recipients: readonly Recipient[];
  timing: Timing;
  // Μόνο όταν πάει σε πελάτη: αν είναι απαραίτητο δεν το σβήνει ο Χρήστης πελάτη.
  isEssential?: boolean;
  // Οι αρχικοί δεν διαγράφονται, μόνο σβήνουν· όσους πρόσθεσε ο admin διαγράφονται.
  isInitial: boolean;
  subject?: { el: string; en: string };
  text: { el: string; en: string };
}

export interface AppEvent {
  id: number;
  groupId: string;
  title: string;
  kind: EventKind;
  // Γεγονότα κόστους: παραλήπτες μόνο όσοι βλέπουν κόστος, κλειδωμένο.
  isCostOnly?: boolean;
  // Τι είναι «μία περίπτωση» για το «μία φορά ανά περίπτωση».
  caseOf: string;
  variables: readonly string[];
}

// Οι μεταβλητές που έχει κάθε κείμενο, όποιο κι αν είναι το Γεγονός.
export const COMMON_VARIABLES: readonly string[] = [
  "παραλήπτης",
  "πελάτης",
  "εταιρεία",
  "σύνδεσμος",
];

const V = {
  sales: ["ευκαιρία", "υπεύθυνος", "πρόταση", "λήξη"],
  agreement: ["συμφωνία", "έναρξη", "λήξη"],
  period: ["συμφωνία", "περίοδος", "έναρξη περιόδου", "παροχές"],
  filming: [
    "γύρισμα",
    "ημερομηνία γυρίσματος",
    "ώρα",
    "τοποθεσία",
    "συνεργείο",
  ],
  deliverable: [
    "παραγωγή",
    "παραδοτέο",
    "έκδοση",
    "προθεσμία",
    "ανατεθειμένος",
  ],
  invoice: ["τιμολόγιο", "ποσό", "λήξη πληρωμής"],
  cost: ["παραγωγή", "περιθώριο", "κόστος"],
  message: ["αποστολέας", "αίτημα", "απόσπασμα"],
  health: ["εργασία", "σφάλμα", "ώρα"],
} as const;

const ev = (
  id: number,
  groupId: string,
  title: string,
  kind: EventKind,
  caseOf: string,
  variables: readonly string[],
  isCostOnly?: boolean,
): AppEvent => ({ id, groupId, title, kind, caseOf, variables, isCostOnly });

export const EVENTS: readonly AppEvent[] = [
  ev(
    1,
    "sales",
    "Νέα Ευκαιρία από φόρμα ενδιαφέροντος",
    "στιγμιαίο",
    "η Ευκαιρία",
    V.sales,
  ),
  ev(
    2,
    "sales",
    "Ο πελάτης άνοιξε τον Σύνδεσμο πρότασης",
    "στιγμιαίο",
    "ο Σύνδεσμος, ανά αναθεώρηση",
    V.sales,
  ),
  ev(
    3,
    "sales",
    "Λήγει ο Σύνδεσμος πρότασης",
    "με ημερομηνία",
    "ο Σύνδεσμος",
    V.sales,
  ),
  ev(4, "sales", "Υπογράφηκε Συμφωνία", "στιγμιαίο", "η Συμφωνία", V.agreement),
  ev(
    5,
    "sales",
    "Λήγει Συμφωνία",
    "με ημερομηνία",
    "η Συμφωνία και η λήξη της",
    V.agreement,
  ),
  ev(
    6,
    "sales",
    "Ζητήθηκε Έγκριση πρότασης",
    "στιγμιαίο",
    "η αναθεώρηση",
    V.sales,
  ),
  ev(
    7,
    "sales",
    "Εγκρίθηκε ή απορρίφθηκε η Έγκριση πρότασης",
    "στιγμιαίο",
    "η αναθεώρηση",
    V.sales,
  ),
  ev(
    8,
    "sales",
    "Ο πελάτης ζήτησε αλλαγές στην πρόταση",
    "στιγμιαίο",
    "η αναθεώρηση",
    V.sales,
  ),
  ev(
    9,
    "sales",
    "Ο πελάτης απέρριψε την πρόταση",
    "στιγμιαίο",
    "η πρόταση",
    V.sales,
  ),
  ev(
    10,
    "sales",
    "Έληξε η πρόταση",
    "με ημερομηνία",
    "η πρόταση και η λήξη της",
    V.sales,
  ),
  ev(
    11,
    "sales",
    "Πέρασε το Επόμενο βήμα μιας Ευκαιρίας",
    "με ημερομηνία",
    "το Επόμενο βήμα",
    V.sales,
  ),
  ev(
    12,
    "filming",
    "Ανοίγει Περίοδος",
    "με ημερομηνία",
    "η Περίοδος",
    V.period,
  ),
  ev(
    13,
    "filming",
    "Ο πελάτης έκλεισε Γύρισμα (αναμένει έγκριση)",
    "στιγμιαίο",
    "το Γύρισμα",
    V.filming,
  ),
  ev(
    14,
    "filming",
    "Γύρισμα εγκρίθηκε ή απορρίφθηκε",
    "στιγμιαίο",
    "το Γύρισμα",
    V.filming,
  ),
  ev(
    15,
    "filming",
    "Εκδόθηκε Δελτίο γυρίσματος",
    "στιγμιαίο",
    "η έκδοση του Δελτίου",
    V.filming,
  ),
  ev(
    16,
    "filming",
    "Ημέρα Γυρίσματος",
    "με ημερομηνία",
    "το Γύρισμα και η ημερομηνία του",
    V.filming,
  ),
  ev(
    17,
    "filming",
    "Γύρισμα μετακινήθηκε στο Google",
    "στιγμιαίο",
    "η μετακίνηση",
    V.filming,
  ),
  ev(
    18,
    "filming",
    "Γύρισμα διαγράφηκε από το Google, θέλει επιβεβαίωση",
    "στιγμιαίο",
    "η διαγραφή",
    V.filming,
  ),
  ev(
    19,
    "filming",
    "Μετακίνηση στο Google απορρίφθηκε",
    "στιγμιαίο",
    "η μετακίνηση",
    V.filming,
  ),
  ev(
    20,
    "filming",
    "Γύρισμα μετατέθηκε μέσα στο DMS",
    "στιγμιαίο",
    "η μετάθεση",
    V.filming,
  ),
  ev(21, "filming", "Γύρισμα ακυρώθηκε", "στιγμιαίο", "το Γύρισμα", V.filming),
  ev(
    22,
    "filming",
    "Ο πελάτης ζήτησε ακύρωση μετά το Όριο ακύρωσης",
    "στιγμιαίο",
    "το Γύρισμα",
    V.filming,
  ),
  ev(
    23,
    "filming",
    "Μέλος του Συνεργείου δήλωσε «δεν μπορώ»",
    "στιγμιαίο",
    "το μέλος στο Γύρισμα",
    V.filming,
  ),
  ev(
    24,
    "filming",
    "Γύρισμα δεν σημειώθηκε ως «έγινε»",
    "αναμονής",
    "το Γύρισμα",
    V.filming,
  ),
  ev(
    25,
    "filming",
    "Η αναμονή έγκρισης Γυρίσματος ξεπέρασε Χ ώρες",
    "αναμονής",
    "το Γύρισμα",
    V.filming,
  ),
  ev(
    26,
    "deliverables",
    "Ανατέθηκε εργασία ή Παραδοτέο",
    "στιγμιαίο",
    "η ανάθεση",
    V.deliverable,
  ),
  ev(
    27,
    "deliverables",
    "Νέα Έκδοση προς έγκριση",
    "στιγμιαίο",
    "η Έκδοση",
    V.deliverable,
  ),
  ev(
    28,
    "deliverables",
    "Ο πελάτης ζήτησε αλλαγές ή ενέκρινε Έκδοση",
    "στιγμιαίο",
    "η Έκδοση",
    V.deliverable,
  ),
  ev(
    29,
    "deliverables",
    "Προθεσμία Παραδοτέου",
    "με ημερομηνία",
    "το Παραδοτέο και η προθεσμία του",
    V.deliverable,
  ),
  ev(
    30,
    "deliverables",
    "Παραγωγή παραδόθηκε",
    "στιγμιαίο",
    "η παράδοση",
    V.deliverable,
  ),
  ev(
    31,
    "deliverables",
    "Έκδοση αναμένει εσωτερικό έλεγχο",
    "στιγμιαίο",
    "η Έκδοση",
    V.deliverable,
  ),
  ev(
    32,
    "deliverables",
    "Έκδοση αναμένει πελάτη Χ μέρες",
    "αναμονής",
    "η Έκδοση",
    V.deliverable,
  ),
  ev(
    33,
    "deliverables",
    "Ξεπεράστηκε το Όριο αλλαγών",
    "στιγμιαίο",
    "το Παραδοτέο",
    V.deliverable,
  ),
  ev(
    34,
    "deliverables",
    "Αίτημα αλλαγής μετά την έγκριση",
    "στιγμιαίο",
    "το Αίτημα",
    V.deliverable,
  ),
  ev(
    54,
    "deliverables",
    "Έκδοση επιστράφηκε από τον εσωτερικό έλεγχο",
    "στιγμιαίο",
    "η επιστροφή",
    V.deliverable,
  ),
  ev(
    55,
    "deliverables",
    "Ο πελάτης ανέφερε link που δεν ανοίγει",
    "στιγμιαίο",
    "η αναφορά",
    V.deliverable,
  ),
  ev(35, "finance", "Γεννήθηκε Τιμολογητέο", "στιγμιαίο", "το Τιμολογητέο", [
    "τιμολογητέο",
    "ποσό",
  ]),
  ev(
    36,
    "finance",
    "Καταχωρήθηκε Τιμολόγιο",
    "στιγμιαίο",
    "το Τιμολόγιο",
    V.invoice,
  ),
  ev(
    37,
    "finance",
    "Τιμολόγιο ληξιπρόθεσμο",
    "με ημερομηνία",
    "το Τιμολόγιο",
    V.invoice,
  ),
  ev(38, "finance", "Καταχωρήθηκε Είσπραξη", "στιγμιαίο", "η Είσπραξη", [
    "είσπραξη",
    "ποσό",
    "τιμολόγιο",
  ]),
  ev(
    39,
    "finance",
    "Χαμηλό περιθώριο πρότασης",
    "στιγμιαίο",
    "η αναθεώρηση",
    V.cost,
    true,
  ),
  ev(
    40,
    "finance",
    "Υπέρβαση κόστους Παραγωγής",
    "στιγμιαίο",
    "η Παραγωγή",
    V.cost,
    true,
  ),
  ev(
    41,
    "finance",
    "Παραγωγή παραδομένη χωρίς πραγματικές ώρες",
    "στιγμιαίο",
    "η Παραγωγή",
    V.cost,
    true,
  ),
  ev(
    56,
    "finance",
    "Τιμολογητέο ανοιχτό Χ μέρες",
    "αναμονής",
    "το Τιμολογητέο",
    ["τιμολογητέο", "ποσό", "μέρες"],
  ),
  ev(42, "comms", "Αργία", "με ημερομηνία", "η αργία της χρονιάς", ["αργία"]),
  ev(
    43,
    "comms",
    "Ο πελάτης προσκάλεσε συνάδελφο",
    "στιγμιαίο",
    "η πρόσκληση",
    ["συνάδελφος"],
  ),
  ev(44, "comms", "Νέο Μήνυμα", "στιγμιαίο", "το Μήνυμα", V.message),
  ev(
    45,
    "comms",
    "Αδιάβαστα Μηνύματα για Χ λεπτά",
    "αναμονής",
    "το διάστημα αδιάβαστων",
    [...V.message, "πλήθος"],
  ),
  ev(46, "comms", "Νέο Αίτημα", "στιγμιαίο", "το Αίτημα", V.message),
  ev(47, "comms", "Αίτημα ανοιχτό Χ μέρες", "αναμονής", "το Αίτημα", V.message),
  ev(
    48,
    "comms",
    "Αίτημα ολοκληρώθηκε ή απορρίφθηκε",
    "στιγμιαίο",
    "το Αίτημα",
    V.message,
  ),
  ev(
    49,
    "comms",
    "Σε ανέφεραν σε Εσωτερικό Μήνυμα",
    "στιγμιαίο",
    "το Μήνυμα",
    V.message,
  ),
  ev(
    50,
    "health",
    "Προγραμματισμένη εργασία δεν έτρεξε",
    "στιγμιαίο",
    "η εργασία και η μέρα",
    V.health,
  ),
  ev(
    51,
    "health",
    "Αποστολή απέτυχε οριστικά",
    "στιγμιαίο",
    "η αποστολή",
    V.health,
  ),
  ev(
    52,
    "health",
    "Ο συγχρονισμός του Google σταμάτησε",
    "στιγμιαίο",
    "η διακοπή",
    V.health,
  ),
  ev(
    53,
    "health",
    "Γεγονός κόλλησε (δεν επεξεργάστηκε)",
    "στιγμιαίο",
    "το Γεγονός",
    V.health,
  ),
  ev(
    57,
    "health",
    "Πλαφόν του Βοηθού",
    "στιγμιαίο",
    "ο μήνας και το όριο (80% ή 100%)",
    ["όριο", "μήνας"],
  ),
];

export const findEvent = (id: number): AppEvent | undefined =>
  EVENTS.find((e) => e.id === id);

// Συντομεύσεις για τους αρχικούς Αυτοματισμούς.
const rel = (label: string): Recipient => ({ kind: "σχετικός", label });
const client: Recipient = {
  kind: "σχετικός",
  label: "ο πελάτης",
  isClient: true,
};
const perm = (permission: string): Recipient => ({
  kind: "δικαίωμα",
  permission,
});
const NOW_T: Timing = { kind: "αμέσως" };
const day = (days: number, at = "09:00"): Timing => ({
  kind: "ημερομηνία",
  days,
  at,
});
const wait = (after: number, unit: "λεπτά" | "ώρες" | "μέρες"): Timing => ({
  kind: "αναμονή",
  after,
  unit,
});

const COST = perm("Βλέπει κόστος και κερδοφορία");
const HEALTH = perm("Βλέπει Υγεία συστήματος");
const INVOICES = perm("Καταχωρεί Τιμολόγια");
const ADMIN = rel("η Διαχείριση");

interface Draft {
  channel: Channel;
  to: readonly Recipient[];
  timing?: Timing;
  isEssential?: boolean;
  isActive?: boolean;
  el: string;
  en?: string;
  subject?: string;
}

// Τα κείμενα είναι πρόχειρα του prototype· τα τελικά τα γράφει ο developer και τα εγκρίνει ο Ιδιοκτήτης.
const make = (eventId: number, drafts: readonly Draft[]): Automation[] =>
  drafts.map((d, index) => ({
    id: `au-${eventId}-${index + 1}`,
    eventId,
    isActive: d.isActive ?? true,
    channel: d.channel,
    recipients: d.to,
    timing: d.timing ?? NOW_T,
    isEssential: d.to.some((r) => r.kind === "σχετικός" && r.isClient)
      ? (d.isEssential ?? false)
      : undefined,
    isInitial: true,
    subject: d.subject ? { el: d.subject, en: "" } : undefined,
    text: { el: d.el, en: d.en ?? "" },
  }));

const note = (
  to: readonly Recipient[],
  el: string,
  timing?: Timing,
): Draft => ({
  channel: "Ειδοποίηση",
  to,
  el,
  timing,
});

export const AUTOMATIONS: readonly Automation[] = [
  ...make(1, [
    note(
      [rel("ο Υπεύθυνος του Πελάτη (αλλιώς όσοι «Μεταβιβάζουν Υπεύθυνο»)")],
      "Νέα Ευκαιρία από τη φόρμα: {ευκαιρία}.",
    ),
    {
      channel: "email",
      to: [{ kind: "επισκέπτης" }],
      subject: "Λάβαμε το αίτημά σας",
      el: "Γεια σας {παραλήπτης}, λάβαμε το αίτημά σας και θα επικοινωνήσουμε μαζί σας σύντομα. {εταιρεία}",
      en: "Hi {παραλήπτης}, we received your request and will be in touch shortly. {εταιρεία}",
    },
  ]),
  ...make(2, [
    note(
      [rel("ο υπεύθυνος της Ευκαιρίας")],
      "Ο {πελάτης} άνοιξε την πρόταση {πρόταση}.",
    ),
  ]),
  ...make(3, [
    note(
      [rel("ο υπεύθυνος της Ευκαιρίας")],
      "Ο Σύνδεσμος της πρότασης {πρόταση} λήγει στις {λήξη}.",
      day(-2),
    ),
  ]),
  ...make(4, [
    {
      channel: "email",
      to: [client],
      isEssential: true,
      subject: "Η Συμφωνία σας με την {εταιρεία}",
      el: "Γεια σας {παραλήπτης}, η Συμφωνία {συμφωνία} υπογράφηκε. Θα τη βρείτε συνημμένη σε PDF.",
      en: "Hi {παραλήπτης}, the agreement {συμφωνία} has been signed. You will find it attached as a PDF.",
    },
    note([ADMIN], "Υπογράφηκε η Συμφωνία {συμφωνία} του {πελάτης}."),
  ]),
  ...make(5, [
    {
      channel: "email",
      to: [client],
      isEssential: true,
      timing: day(-30),
      subject: "Η Συμφωνία σας λήγει στις {λήξη}",
      el: "Γεια σας {παραλήπτης}, η Συμφωνία {συμφωνία} λήγει στις {λήξη}. Θα επικοινωνήσουμε μαζί σας για τη συνέχεια.",
    },
    note(
      [ADMIN],
      "Η Συμφωνία {συμφωνία} του {πελάτης} λήγει στις {λήξη}.",
      day(-30),
    ),
  ]),
  ...make(6, [
    note(
      [perm("Παρεκκλίνει από τον Κατάλογο")],
      "Ζητήθηκε Έγκριση για την πρόταση {πρόταση}.",
    ),
    note(
      [perm("Παρεκκλίνει από τον Κατάλογο")],
      "Η Έγκριση της πρότασης {πρόταση} περιμένει 2 εργάσιμες.",
      wait(2, "μέρες"),
    ),
  ]),
  ...make(7, [
    note(
      [rel("ο υπεύθυνος της Ευκαιρίας")],
      "Απαντήθηκε η Έγκριση της πρότασης {πρόταση}.",
    ),
  ]),
  ...make(8, [
    note(
      [rel("ο υπεύθυνος της Ευκαιρίας")],
      "Ο {πελάτης} ζήτησε αλλαγές στην πρόταση {πρόταση}.",
    ),
  ]),
  ...make(9, [
    note(
      [rel("ο υπεύθυνος της Ευκαιρίας")],
      "Ο {πελάτης} απέρριψε την πρόταση {πρόταση}.",
    ),
  ]),
  ...make(10, [
    note(
      [rel("ο υπεύθυνος της Ευκαιρίας")],
      "Έληξε η πρόταση {πρόταση}: Παράταση ή απώλεια;",
    ),
  ]),
  ...make(11, [
    note(
      [rel("ο υπεύθυνος της Ευκαιρίας")],
      "Πέρασε το Επόμενο βήμα της Ευκαιρίας {ευκαιρία}.",
    ),
  ]),
  ...make(12, [
    {
      channel: "email",
      to: [client],
      timing: day(0),
      subject: "Ξεκινά η νέα σας Περίοδος",
      el: "Γεια σας {παραλήπτης}, ξεκινά η Περίοδος {περίοδος} της Συμφωνίας {συμφωνία}, με {παροχές}.",
    },
    {
      channel: "email",
      to: [client],
      timing: day(-5),
      subject: "Κλείστε το επόμενο Γύρισμα",
      el: "Γεια σας {παραλήπτης}, σε 5 μέρες ξεκινά η νέα Περίοδος. Κλείστε το Γύρισμά σας: {σύνδεσμος}",
    },
  ]),
  ...make(13, [
    note(
      [ADMIN],
      "Ο {πελάτης} έκλεισε Γύρισμα στις {ημερομηνία γυρίσματος}. Αναμένει έγκριση.",
    ),
  ]),
  ...make(14, [
    {
      channel: "email",
      to: [client],
      isEssential: true,
      subject: "Το Γύρισμά σας στις {ημερομηνία γυρίσματος}",
      el: "Γεια σας {παραλήπτης}, απαντήσαμε στο Γύρισμα της {ημερομηνία γυρίσματος}: {σύνδεσμος}",
    },
  ]),
  ...make(15, [
    {
      channel: "email",
      to: [rel("το Συνεργείο")],
      subject: "Δελτίο γυρίσματος {γύρισμα}",
      el: "Νέο Δελτίο για το Γύρισμα {γύρισμα}, {ημερομηνία γυρίσματος} {ώρα}. Επιβεβαίωσε: {σύνδεσμος}",
    },
  ]),
  ...make(16, [
    {
      channel: "email",
      to: [rel("το Συνεργείο"), client],
      timing: day(-1, "17:00"),
      subject: "Αύριο: Γύρισμα στις {ώρα}",
      el: "Υπενθύμιση: αύριο {ημερομηνία γυρίσματος} στις {ώρα}, {τοποθεσία}.",
    },
  ]),
  ...make(17, [
    {
      channel: "email",
      to: [rel("το Συνεργείο"), client],
      isEssential: true,
      subject: "Νέα ώρα για το Γύρισμα",
      el: "Το Γύρισμα {γύρισμα} μετακινήθηκε: {ημερομηνία γυρίσματος} {ώρα}.",
    },
  ]),
  ...make(18, [
    note(
      [rel("όποιος το διέγραψε")],
      "Διέγραψες το Γύρισμα {γύρισμα} από το Google. Επαναφορά ή Επιβεβαίωση με λόγο.",
    ),
    {
      channel: "email",
      to: [rel("όποιος το διέγραψε")],
      subject: "Θέλει επιβεβαίωση: Γύρισμα {γύρισμα}",
      el: "Διέγραψες το Γύρισμα {γύρισμα} από το Google. Διάλεξε Επαναφορά ή Επιβεβαίωση: {σύνδεσμος}",
    },
  ]),
  ...make(19, [
    note(
      [ADMIN],
      "Η μετακίνηση του Γυρίσματος {γύρισμα} στο Google απορρίφθηκε: {σύνδεσμος}",
    ),
  ]),
  ...make(20, [
    {
      channel: "email",
      to: [rel("το Συνεργείο"), client],
      isEssential: true,
      subject: "Νέα ημερομηνία Γυρίσματος",
      el: "Το Γύρισμα {γύρισμα} μετατέθηκε στις {ημερομηνία γυρίσματος} {ώρα}.",
    },
  ]),
  ...make(21, [
    {
      channel: "email",
      to: [rel("το Συνεργείο"), client],
      isEssential: true,
      subject: "Ακύρωση Γυρίσματος",
      el: "Το Γύρισμα {γύρισμα} της {ημερομηνία γυρίσματος} ακυρώθηκε.",
    },
  ]),
  ...make(22, [
    note(
      [perm("Εγκρίνει κράτηση")],
      "Ο {πελάτης} ζητά ακύρωση μετά το Όριο για το Γύρισμα {γύρισμα}.",
    ),
  ]),
  ...make(23, [
    note(
      [rel("ο Υπεύθυνος της Παραγωγής")],
      "Μέλος του Συνεργείου δεν μπορεί στο Γύρισμα {γύρισμα}.",
    ),
  ]),
  ...make(24, [
    note(
      [rel("ο Υπεύθυνος της Παραγωγής")],
      "Το Γύρισμα {γύρισμα} δεν σημειώθηκε ως «έγινε».",
      wait(1, "μέρες"),
    ),
  ]),
  ...make(25, [
    note(
      [perm("Εγκρίνει κράτηση")],
      "Το Γύρισμα {γύρισμα} περιμένει έγκριση.",
      wait(24, "ώρες"),
    ),
  ]),
  ...make(26, [
    note(
      [rel("όποιος το ανέλαβε")],
      "Σου ανατέθηκε: {παραδοτέο} ({παραγωγή}).",
    ),
  ]),
  ...make(27, [
    {
      channel: "email",
      to: [client],
      isEssential: true,
      subject: "Νέα Έκδοση για έγκριση: {παραδοτέο}",
      el: "Γεια σας {παραλήπτης}, η Έκδοση {έκδοση} του {παραδοτέο} σας περιμένει: {σύνδεσμος}",
    },
  ]),
  ...make(28, [
    note(
      [rel("ο Υπεύθυνος της Παραγωγής")],
      "Ο {πελάτης} απάντησε στην Έκδοση {έκδοση} του {παραδοτέο}.",
    ),
  ]),
  ...make(29, [
    note(
      [rel("ο Ανατεθειμένος")],
      "Η προθεσμία του {παραδοτέο} είναι στις {προθεσμία}.",
      day(-2),
    ),
    note(
      [rel("ο Ανατεθειμένος"), rel("ο Υπεύθυνος της Παραγωγής")],
      "Σήμερα είναι η προθεσμία του {παραδοτέο}.",
      day(0),
    ),
  ]),
  ...make(30, [
    {
      channel: "email",
      to: [client],
      isEssential: true,
      subject: "Η παραγωγή σας παραδόθηκε",
      el: "Γεια σας {παραλήπτης}, η {παραγωγή} ολοκληρώθηκε. Όλα τα Παραδοτέα: {σύνδεσμος}",
    },
  ]),
  ...make(31, [
    note(
      [perm("Ελέγχει Παραδοτέα")],
      "Η Έκδοση {έκδοση} του {παραδοτέο} περιμένει έλεγχο.",
    ),
  ]),
  ...make(32, [
    {
      channel: "email",
      to: [client],
      timing: wait(3, "μέρες"),
      subject: "Σας περιμένει: {παραδοτέο}",
      el: "Γεια σας {παραλήπτης}, η Έκδοση {έκδοση} περιμένει την απάντησή σας: {σύνδεσμος}",
    },
    {
      channel: "email",
      to: [client],
      timing: wait(7, "μέρες"),
      subject: "Σας περιμένει ακόμα: {παραδοτέο}",
      el: "Γεια σας {παραλήπτης}, η Έκδοση {έκδοση} περιμένει ακόμα: {σύνδεσμος}",
    },
    note(
      [rel("ο Υπεύθυνος της Παραγωγής")],
      "Η Έκδοση {έκδοση} περιμένει τον πελάτη 3 μέρες.",
      wait(3, "μέρες"),
    ),
    note(
      [rel("ο Υπεύθυνος της Παραγωγής")],
      "Η Έκδοση {έκδοση} περιμένει τον πελάτη 7 μέρες.",
      wait(7, "μέρες"),
    ),
  ]),
  ...make(33, [
    note(
      [rel("ο Υπεύθυνος της Παραγωγής")],
      "Το {παραδοτέο} ξεπέρασε το Όριο αλλαγών.",
    ),
  ]),
  ...make(34, [
    note(
      [rel("ο Υπεύθυνος του Πελάτη")],
      "Αίτημα αλλαγής μετά την έγκριση: {παραδοτέο}.",
    ),
  ]),
  ...make(54, [
    note(
      [rel("ο Ανατεθειμένος")],
      "Η Έκδοση {έκδοση} επιστράφηκε από τον έλεγχο.",
    ),
  ]),
  ...make(55, [
    note(
      [rel("ο Ανατεθειμένος"), rel("ο Υπεύθυνος της Παραγωγής")],
      "Ο {πελάτης} λέει ότι το link του {παραδοτέο} δεν ανοίγει.",
    ),
  ]),
  ...make(35, [
    note(
      [INVOICES, rel("ο Λογιστής")],
      "Νέο Τιμολογητέο: {τιμολογητέο}, {ποσό}.",
    ),
  ]),
  ...make(36, [
    {
      channel: "email",
      to: [client],
      isEssential: true,
      subject: "Τιμολόγιο {τιμολόγιο}",
      el: "Γεια σας {παραλήπτης}, θα βρείτε συνημμένο το Τιμολόγιο {τιμολόγιο}, πληρωτέο έως {λήξη πληρωμής}.",
      en: "Hi {παραλήπτης}, please find attached invoice {τιμολόγιο}, payable by {λήξη πληρωμής}.",
    },
  ]),
  ...make(37, [
    {
      channel: "email",
      to: [client],
      isEssential: true,
      timing: day(0),
      subject: "Ληξιπρόθεσμο Τιμολόγιο {τιμολόγιο}",
      el: "Γεια σας {παραλήπτης}, το Τιμολόγιο {τιμολόγιο} έληξε στις {λήξη πληρωμής}.",
    },
    note([ADMIN], "Ληξιπρόθεσμο Τιμολόγιο {τιμολόγιο} του {πελάτης}.", day(0)),
  ]),
  ...make(38, [
    {
      ...note([ADMIN], "Καταχωρήθηκε Είσπραξη {ποσό} για το {τιμολόγιο}."),
      isActive: false,
    },
  ]),
  ...make(39, [note([COST], "Χαμηλό περιθώριο στην πρόταση: {περιθώριο}.")]),
  ...make(40, [note([COST], "Υπέρβαση κόστους στην {παραγωγή}.")]),
  ...make(41, [
    note([COST], "Η {παραγωγή} παραδόθηκε χωρίς πραγματικές ώρες."),
  ]),
  ...make(56, [
    note(
      [INVOICES],
      "Το Τιμολογητέο {τιμολογητέο} είναι ανοιχτό 7 μέρες.",
      wait(7, "μέρες"),
    ),
    note(
      [INVOICES],
      "Το Τιμολογητέο {τιμολογητέο} είναι ανοιχτό 14 μέρες.",
      wait(14, "μέρες"),
    ),
  ]),
  ...make(42, [
    {
      channel: "email",
      to: [client],
      timing: day(0, "08:00"),
      subject: "Χρόνια πολλά από την {εταιρεία}",
      el: "Γεια σας {παραλήπτης}, χρόνια πολλά για {αργία}!",
      en: "Hi {παραλήπτης}, best wishes for {αργία}!",
    },
  ]),
  ...make(43, [note([ADMIN], "Ο {πελάτης} προσκάλεσε τον/την {συνάδελφος}.")]),
  ...make(44, [
    note(
      [
        rel("ο Υπεύθυνος του Πελάτη"),
        rel("τα Μέλη της Παραγωγής της ετικέτας"),
      ],
      "Νέο Μήνυμα από {αποστολέας}: {απόσπασμα}",
    ),
    {
      ...note([client], "Νέο Μήνυμα από την {εταιρεία}: {απόσπασμα}"),
      isEssential: false,
    },
  ]),
  ...make(45, [
    {
      channel: "email",
      to: [rel("οι παραλήπτες του Γεγονότος 44"), client],
      isEssential: true,
      timing: wait(15, "λεπτά"),
      subject: "{πλήθος} αδιάβαστα Μηνύματα",
      el: "Έχετε {πλήθος} αδιάβαστα Μηνύματα. Απαντήστε στο DMS: {σύνδεσμος}",
    },
  ]),
  ...make(46, [
    note(
      [rel("ο υπεύθυνος του Αιτήματος (αλλιώς όσοι «Μεταβιβάζουν Υπεύθυνο»)")],
      "Νέο Αίτημα από τον {πελάτης}: {αίτημα}.",
    ),
  ]),
  ...make(47, [
    note(
      [rel("ο υπεύθυνος του Αιτήματος")],
      "Το Αίτημα {αίτημα} είναι ανοιχτό 3 μέρες.",
      wait(3, "μέρες"),
    ),
  ]),
  ...make(48, [
    {
      ...note([client], "Το Αίτημά σας «{αίτημα}» έκλεισε."),
      isEssential: true,
    },
  ]),
  ...make(49, [
    note(
      [rel("το μέλος που αναφέρθηκε")],
      "Ο {αποστολέας} σε ανέφερε: {απόσπασμα}",
    ),
  ]),
  ...(
    [
      [50, "Η εργασία {εργασία} δεν έτρεξε στις {ώρα}."],
      [51, "Αποστολή απέτυχε οριστικά: {σφάλμα}."],
      [52, "Ο συγχρονισμός του Google σταμάτησε στις {ώρα}."],
      [53, "Ένα Γεγονός κόλλησε: {σφάλμα}."],
      [57, "Ο Βοηθός έφτασε το {όριο} του πλαφόν του {μήνας}."],
    ] as const
  ).flatMap(([id, text]) =>
    make(id, [
      note([HEALTH], text),
      {
        channel: "email",
        to: [HEALTH],
        subject: "Υγεία συστήματος: χρειάζεται προσοχή",
        el: text,
      },
    ]),
  ),
  // Ένας Αυτοματισμός που πρόσθεσε η Διαχείριση (κεφ. 4, σενάριο 1): διαγράφεται, σε αντίθεση με τους αρχικούς.
  {
    id: "au-16-added",
    eventId: 16,
    isActive: true,
    channel: "Ειδοποίηση",
    recipients: [rel("το Συνεργείο")],
    timing: day(0, "07:30"),
    isInitial: false,
    text: { el: "Σήμερα: Γύρισμα {γύρισμα} στις {ώρα}, {τοποθεσία}.", en: "" },
  },
];

export const automationsOf = (eventId: number): readonly Automation[] =>
  AUTOMATIONS.filter((a) => a.eventId === eventId);

// Οι αργίες του Γεγονότος 42 για το 2026: 13 επίσημες (με τις κινητές του Πάσχα), ο admin σβήνει ή προσθέτει.
export const HOLIDAYS_2026: readonly {
  date: string;
  name: string;
  isOn: boolean;
  isAdded?: boolean;
}[] = [
  { date: "2026-01-01", name: "Πρωτοχρονιά", isOn: true },
  { date: "2026-01-06", name: "Θεοφάνεια", isOn: true },
  { date: "2026-02-23", name: "Καθαρά Δευτέρα", isOn: false },
  { date: "2026-03-25", name: "25η Μαρτίου", isOn: true },
  { date: "2026-04-10", name: "Μεγάλη Παρασκευή", isOn: false },
  { date: "2026-04-12", name: "Πάσχα", isOn: true },
  { date: "2026-04-13", name: "Δευτέρα του Πάσχα", isOn: false },
  { date: "2026-05-01", name: "Πρωτομαγιά", isOn: true },
  { date: "2026-06-01", name: "Αγίου Πνεύματος", isOn: false },
  { date: "2026-08-15", name: "Δεκαπενταύγουστος", isOn: true },
  { date: "2026-10-26", name: "Αγίου Δημητρίου", isOn: true, isAdded: true },
  { date: "2026-10-28", name: "28η Οκτωβρίου", isOn: true },
  { date: "2026-12-25", name: "Χριστούγεννα", isOn: true },
  { date: "2026-12-26", name: "Σύναξη της Θεοτόκου", isOn: false },
];

// Μηνύματα συστήματος: πάντα ενεργά, ο admin αλλάζει μόνο το κείμενο. Οι απαραίτητες μεταβλητές δεν σβήνουν.
export interface SystemMessage {
  id: string;
  title: string;
  when: string;
  note: string;
  requiredVariables: readonly string[];
  variables: readonly string[];
  subject: { el: string; en: string };
  text: { el: string; en: string };
  isEdited: boolean;
  editedBy?: string;
  editedAt?: string;
}

export const SYSTEM_MESSAGES: readonly SystemMessage[] = [
  {
    id: "invite",
    title: "Πρόσκληση",
    when: "Όταν προσκαλείται Χρήστης ομάδας ή πελάτη, και ο Υπογράφων μετά την υπογραφή.",
    note: "Η είσοδος είναι μόνο με πρόσκληση. Ο σύνδεσμος ισχύει 7 μέρες.",
    requiredVariables: ["σύνδεσμος"],
    variables: ["παραλήπτης", "εταιρεία", "σύνδεσμος", "προσκαλών"],
    subject: {
      el: "Πρόσκληση στο DMS της {εταιρεία}",
      en: "Your invitation to {εταιρεία}'s DMS",
    },
    text: {
      el: "Γεια σας {παραλήπτης},\nο/η {προσκαλών} σας προσκάλεσε. Ορίστε κωδικό και μπείτε: {σύνδεσμος}",
      en: "Hi {παραλήπτης},\n{προσκαλών} invited you. Set a password and sign in: {σύνδεσμος}",
    },
    isEdited: true,
    editedBy: "giorgos",
    editedAt: "2026-09-02T10:15",
  },
  {
    id: "magic-link",
    title: "Σύνδεσμος εισόδου",
    when: "Όταν ο Χρήστης ζητά είσοδο με σύνδεσμο.",
    note: "Ο σύνδεσμος ισχύει 1 ώρα και μία φορά.",
    requiredVariables: ["σύνδεσμος"],
    variables: ["παραλήπτης", "εταιρεία", "σύνδεσμος"],
    subject: { el: "Ο σύνδεσμος εισόδου σας", en: "Your sign-in link" },
    text: {
      el: "Γεια σας {παραλήπτης},\nπατήστε για να μπείτε: {σύνδεσμος}\nΑν δεν το ζητήσατε, αγνοήστε το.",
      en: "Hi {παραλήπτης},\nclick to sign in: {σύνδεσμος}\nIf you didn't ask for this, ignore it.",
    },
    isEdited: false,
  },
  {
    id: "reset",
    title: "Επαναφορά κωδικού",
    when: "Όταν ο Χρήστης ξεχάσει τον κωδικό.",
    note: "Ο σύνδεσμος ισχύει 1 ώρα και μία φορά.",
    requiredVariables: ["σύνδεσμος"],
    variables: ["παραλήπτης", "εταιρεία", "σύνδεσμος"],
    subject: { el: "Επαναφορά κωδικού", en: "Reset your password" },
    text: {
      el: "Γεια σας {παραλήπτης},\nορίστε νέο κωδικό εδώ: {σύνδεσμος}",
      en: "Hi {παραλήπτης},\nset a new password here: {σύνδεσμος}",
    },
    isEdited: false,
  },
  {
    id: "sign-code",
    title: "Κωδικός υπογραφής",
    when: "Όταν ο Υπογράφων επιβεβαιώνει την υπογραφή.",
    note: "Ένας κωδικός ανά 60 δευτερόλεπτα, πέντε ανά ώρα για κάθε Σύνδεσμο πρότασης.",
    requiredVariables: ["κωδικός"],
    variables: ["παραλήπτης", "εταιρεία", "κωδικός", "πρόταση"],
    subject: {
      el: "Κωδικός υπογραφής: {κωδικός}",
      en: "Signing code: {κωδικός}",
    },
    text: {
      el: "Ο κωδικός για την υπογραφή της πρότασης {πρόταση} είναι {κωδικός}. Ισχύει 10 λεπτά.",
      en: "Your code to sign proposal {πρόταση} is {κωδικός}. Valid for 10 minutes.",
    },
    isEdited: false,
  },
  {
    id: "proposal-link",
    title: "Αποστολή Συνδέσμου πρότασης",
    when: "Όταν η ομάδα στέλνει πρόταση. Κάθε παραλήπτης παίρνει τον δικό του σύνδεσμο.",
    note: "Φεύγει στη γλώσσα του Πελάτη.",
    requiredVariables: ["σύνδεσμος"],
    variables: [
      "παραλήπτης",
      "εταιρεία",
      "σύνδεσμος",
      "πρόταση",
      "λήξη",
      "αποστολέας",
    ],
    subject: { el: "Η πρότασή μας: {πρόταση}", en: "Our proposal: {πρόταση}" },
    text: {
      el: "Γεια σας {παραλήπτης},\nη πρόταση {πρόταση} σας περιμένει ως τις {λήξη}: {σύνδεσμος}\n{αποστολέας}",
      en: "",
    },
    isEdited: false,
  },
];

// Ιστορικό αποστολών: τι, σε ποιον, πότε, αποτέλεσμα. Το σώμα του μηνύματος δεν κρατιέται, μόνο ο τίτλος.
export type SendState =
  | "προγραμματισμένο"
  | "στάλθηκε"
  | "ξαναδοκιμάζεται"
  | "απέτυχε"
  | "δεν στάλθηκε";

export interface Send {
  id: string;
  at: string;
  // Αυτοματισμός ή Μήνυμα συστήματος.
  source:
    | { kind: "αυτοματισμός"; automationId: string }
    | { kind: "σύστημα"; systemId: string };
  channel: Channel;
  title: string;
  recipient: { name: string; isClient: boolean; email?: string };
  clientId?: string;
  state: SendState;
  attempts: number;
  reason?: string;
}

const send = (s: Omit<Send, "attempts"> & { attempts?: number }): Send => ({
  attempts: 1,
  ...s,
});
const auto = (automationId: string) => ({
  kind: "αυτοματισμός" as const,
  automationId,
});
const MARIA = {
  name: "Μαρία Παπαδάκη",
  isClient: true,
  email: "maria@example.com",
};
const NIKOS_C = {
  name: "Νίκος Σταυρίδης",
  isClient: true,
  email: "nikos@example.com",
};

export const SENDS: readonly Send[] = [
  send({
    id: "s-01",
    at: "2026-09-21T09:00",
    source: auto("au-16-1"),
    channel: "email",
    title: "Αύριο: Γύρισμα στις 10:00",
    recipient: MARIA,
    clientId: "kypseli",
    state: "προγραμματισμένο",
    attempts: 0,
  }),
  send({
    id: "s-02",
    at: "2026-09-22T07:30",
    source: auto("au-16-added"),
    channel: "Ειδοποίηση",
    title: "Σήμερα: Γύρισμα στις 10:00",
    recipient: { name: "Άρης Κωνσταντίνου", isClient: false },
    clientId: "kypseli",
    state: "προγραμματισμένο",
    attempts: 0,
  }),
  send({
    id: "s-03",
    at: "2026-10-07T09:00",
    source: auto("au-12-2"),
    channel: "email",
    title: "Κλείστε το επόμενο Γύρισμα",
    recipient: MARIA,
    clientId: "kypseli",
    state: "προγραμματισμένο",
    attempts: 0,
  }),
  send({
    id: "s-04",
    at: "2026-09-20T11:42",
    source: auto("au-36-1"),
    channel: "email",
    title: "Τιμολόγιο Α-58",
    recipient: MARIA,
    clientId: "kypseli",
    state: "στάλθηκε",
  }),
  send({
    id: "s-05",
    at: "2026-09-20T11:42",
    source: auto("au-36-1"),
    channel: "email",
    title: "Τιμολόγιο Α-58",
    recipient: NIKOS_C,
    clientId: "kypseli",
    state: "στάλθηκε",
  }),
  send({
    id: "s-06",
    at: "2026-09-20T10:05",
    source: auto("au-27-1"),
    channel: "email",
    title: "Νέα Έκδοση για έγκριση: Reel Σεπτεμβρίου",
    recipient: MARIA,
    clientId: "kypseli",
    state: "στάλθηκε",
  }),
  send({
    id: "s-07",
    at: "2026-09-20T09:00",
    source: auto("au-37-1"),
    channel: "email",
    title: "Ληξιπρόθεσμο Τιμολόγιο Α-41",
    recipient: {
      name: "Ελένη Ράπτη",
      isClient: true,
      email: "eleni@example.com",
    },
    clientId: "meli",
    state: "απέτυχε",
    attempts: 4,
    reason: "Ξεπεράστηκε το ημερήσιο όριο αποστολών.",
  }),
  send({
    id: "s-08",
    at: "2026-09-20T09:00",
    source: auto("au-37-2"),
    channel: "Ειδοποίηση",
    title: "Ληξιπρόθεσμο Τιμολόγιο Α-41",
    recipient: { name: "Δημήτρης Ιωάννου", isClient: false },
    clientId: "meli",
    state: "στάλθηκε",
  }),
  send({
    id: "s-09",
    at: "2026-09-20T08:15",
    source: auto("au-45-1"),
    channel: "email",
    title: "2 αδιάβαστα Μηνύματα",
    recipient: {
      name: "Σταύρος Μπαλτάς",
      isClient: true,
      email: "stavros@example.com",
    },
    clientId: "kinisi",
    state: "ξαναδοκιμάζεται",
    attempts: 2,
    reason: "Ο πάροχος δεν απάντησε. Νέα προσπάθεια στις 12:30.",
  }),
  send({
    id: "s-10",
    at: "2026-09-19T16:20",
    source: { kind: "σύστημα", systemId: "invite" },
    channel: "email",
    title: "Πρόσκληση στο DMS",
    recipient: NIKOS_C,
    clientId: "kypseli",
    state: "στάλθηκε",
  }),
  send({
    id: "s-11",
    at: "2026-09-19T12:00",
    source: auto("au-44-2"),
    channel: "Ειδοποίηση",
    title: "Νέο Μήνυμα από την ομάδα",
    recipient: NIKOS_C,
    clientId: "kypseli",
    state: "δεν στάλθηκε",
    attempts: 0,
    reason: "Ο παραλήπτης το έχει σβήσει για τον εαυτό του.",
  }),
  send({
    id: "s-12",
    at: "2026-09-18T09:00",
    source: auto("au-5-1"),
    channel: "email",
    title: "Η Συμφωνία σας λήγει στις 18/10/2026",
    recipient: {
      name: "Κώστας Λάμπρου",
      isClient: true,
      email: "kostas@example.com",
    },
    clientId: "armyra",
    state: "στάλθηκε",
  }),
  send({
    id: "s-13",
    at: "2026-09-17T14:03",
    source: { kind: "σύστημα", systemId: "sign-code" },
    channel: "email",
    title: "Κωδικός υπογραφής",
    recipient: {
      name: "Μαρία Σιμιτζή",
      isClient: true,
      email: "msimitzi@example.com",
    },
    clientId: "athina",
    state: "στάλθηκε",
  }),
  send({
    id: "s-14",
    at: "2026-09-16T10:00",
    source: auto("au-20-1"),
    channel: "email",
    title: "Νέα ημερομηνία Γυρίσματος",
    recipient: MARIA,
    clientId: "kypseli",
    state: "δεν στάλθηκε",
    attempts: 0,
    reason: "Ακυρώθηκε: το Γύρισμα μετακινήθηκε ξανά πριν φύγει.",
  }),
  send({
    id: "s-15",
    at: "2026-09-15T08:00",
    source: auto("au-42-1"),
    channel: "email",
    title: "Χρόνια πολλά από την Devre",
    recipient: {
      name: "Δρ. Ιωάννα Φέτση",
      isClient: true,
      email: "fetsi@example.com",
    },
    clientId: "hamogelo",
    state: "στάλθηκε",
  }),
];

// Οι Ειδοποιήσεις του καμπανακιού (A2) για κάθε Χρήστη του prototype. Κρατιούνται 90 μέρες.
export interface InboxItem {
  id: string;
  personId: string;
  eventId: number;
  at: string;
  text: string;
  link?: { code: string; params: Readonly<Record<string, string>> };
  isRead: boolean;
}

export const INBOX: readonly InboxItem[] = [
  {
    id: "n-01",
    personId: "giorgos",
    eventId: 51,
    at: "2026-09-20T11:50",
    text: "Αποστολή απέτυχε οριστικά: Ληξιπρόθεσμο Τιμολόγιο Α-41 στο Ζαχαροπλαστείο Μέλι.",
    link: { code: "K3", params: { tab: "failed" } },
    isRead: false,
  },
  {
    id: "n-02",
    personId: "giorgos",
    eventId: 39,
    at: "2026-09-20T10:30",
    text: "Χαμηλό περιθώριο στην πρόταση του Καφέ Αθήναιον: 18%.",
    link: { code: "B4", params: {} },
    isRead: false,
  },
  {
    id: "n-03",
    personId: "giorgos",
    eventId: 35,
    at: "2026-09-19T17:00",
    text: "Νέο Τιμολογητέο: Κυψέλη Καφέ, Περίοδος Οκτωβρίου.",
    link: { code: "I1", params: {} },
    isRead: true,
  },
  {
    id: "n-04",
    personId: "giorgos",
    eventId: 13,
    at: "2026-09-18T09:12",
    text: "Η Κυψέλη Καφέ έκλεισε Γύρισμα στις 02/10. Αναμένει έγκριση.",
    link: { code: "E2", params: {} },
    isRead: true,
  },
  {
    id: "n-05",
    personId: "dimitris",
    eventId: 37,
    at: "2026-09-20T09:00",
    text: "Ληξιπρόθεσμο Τιμολόγιο Α-41 του Ζαχαροπλαστείο Μέλι.",
    link: { code: "I1", params: {} },
    isRead: false,
  },
  {
    id: "n-06",
    personId: "dimitris",
    eventId: 13,
    at: "2026-09-18T09:12",
    text: "Η Κυψέλη Καφέ έκλεισε Γύρισμα στις 02/10. Αναμένει έγκριση.",
    link: { code: "E2", params: {} },
    isRead: true,
  },
  {
    id: "n-07",
    personId: "dimitris",
    eventId: 43,
    at: "2026-09-17T15:40",
    text: "Η Κυψέλη Καφέ προσκάλεσε τον Νίκο Σταυρίδη.",
    isRead: true,
  },
  {
    id: "n-08",
    personId: "aris",
    eventId: 26,
    at: "2026-09-20T09:30",
    text: "Σου ανατέθηκε: Reel Σεπτεμβρίου (Κυψέλη Καφέ — Σεπτέμβριος).",
    link: { code: "H1", params: {} },
    isRead: false,
  },
  {
    id: "n-09",
    personId: "aris",
    eventId: 28,
    at: "2026-09-19T18:10",
    text: "Η Κυψέλη Καφέ ζήτησε αλλαγές στην Έκδοση 2 του Carousel.",
    link: { code: "H1", params: {} },
    isRead: true,
  },
  {
    id: "n-10",
    personId: "anna",
    eventId: 2,
    at: "2026-09-20T11:05",
    text: "Το Καφέ Αθήναιον άνοιξε την πρόταση.",
    link: { code: "B4", params: {} },
    isRead: false,
  },
  {
    id: "n-11",
    personId: "anna",
    eventId: 11,
    at: "2026-09-20T09:00",
    text: "Πέρασε το Επόμενο βήμα της Ευκαιρίας «Οδοντιατρείο Χαμόγελο».",
    link: { code: "B3", params: {} },
    isRead: true,
  },
  {
    id: "n-12",
    personId: "client",
    eventId: 48,
    at: "2026-09-19T13:00",
    text: "Το Αίτημά σας «Story για την προσφορά» έκλεισε.",
    link: { code: "J3", params: { tab: "requests" } },
    isRead: false,
  },
  {
    id: "n-13",
    personId: "client",
    eventId: 44,
    at: "2026-09-19T12:00",
    text: "Νέο Μήνυμα από την Devre: «Ανεβάσαμε την Έκδοση 2.»",
    link: { code: "J3", params: {} },
    isRead: true,
  },
];
