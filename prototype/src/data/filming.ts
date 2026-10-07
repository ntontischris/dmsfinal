// Φανταστικά δεδομένα του module «4 Γυρίσματα»: Γυρίσματα, Συνεργείο, Δελτίο, Ωράριο κρατήσεων, Χωρητικότητα, Κανόνες γυρισμάτων.
// Repo public: μόνο επινοημένα ονόματα. Τα Γυρίσματα ταιριάζουν με τις Παροχές των Περιόδων του agreements.ts.
// Πηγές: κεφ. 3.4 Γυρίσματα και ημερολόγιο, ADR 0010, ADR 0005, ADR 0017.

import type { RoleId } from "@/data/roles";

// Το prototype «τώρα»: Κυριακή 20/9/2026, μεσημέρι (ίδια μέρα με το TODAY των Πωλήσεων).
export const NOW = "2026-09-20T12:00";

export type FilmingState =
  | "αναμένει έγκριση"
  | "προγραμματισμένο"
  | "έγινε"
  | "δεν έγινε"
  | "ακυρώθηκε"
  | "απορρίφθηκε";

export const OPEN_STATES: readonly FilmingState[] = [
  "αναμένει έγκριση",
  "προγραμματισμένο",
];

// Κανόνες γυρισμάτων (Ρυθμίσεις › Γυρίσματα, O4), με τις αρχικές τιμές του κεφ. 3.4.
export const FILMING_RULES = {
  needsApproval: true,
  noAnswer: {
    hours: 24,
    action: "τίποτα" as "τίποτα" | "αυτόματη έγκριση" | "αυτόματη απόρριψη",
  },
  horizonDays: 60,
  outsidePeriod: false,
  rescheduleNeedsApproval: true,
  equipmentConflict: "προειδοποιεί" as "προειδοποιεί" | "μπλοκάρει",
  clientSeesEquipment: false,
  sheetSending: "με το χέρι" as "με το χέρι" | "αυτόματα",
  changeResetsConfirmations: true,
  doneMarking: "με το χέρι" as "με το χέρι" | "αυτόματα στη λήξη",
} as const;

// Ωράριο κρατήσεων: εβδομαδιαίο πρόγραμμα (0 = Κυριακή), επιτρεπτές διάρκειες, βήμα έναρξης, Χωρητικότητα.
export const BOOKING_HOURS = {
  week: {
    0: null,
    1: { from: 9, to: 19 },
    2: { from: 9, to: 19 },
    3: { from: 9, to: 19 },
    4: { from: 9, to: 19 },
    5: { from: 9, to: 19 },
    6: { from: 10, to: 15 },
  } as Readonly<Record<number, { from: number; to: number } | null>>,
  durations: [2, 3, 4] as readonly number[],
  stepMinutes: 60,
  capacity: 2,
  capacityByDay: { "2026-09-30": 1 } as Readonly<Record<string, number>>,
  closedDays: {
    "2026-10-28": "Αργία: 28η Οκτωβρίου",
  } as Readonly<Record<string, string>>,
};

export interface CrewPerson {
  id: string;
  name: string;
  roleLabel: string;
  skill: string;
}

// Οι άνθρωποι της ομάδας που μπαίνουν σε Συνεργείο. Ο Άρης είναι ο χρήστης του ρόλου «Παραγωγή» στο prototype.
export const CREW_PEOPLE: readonly CrewPerson[] = [
  {
    id: "giorgos",
    name: "Γιώργος Μαυρίδης",
    roleLabel: "Ιδιοκτήτης",
    skill: "σκηνοθεσία",
  },
  {
    id: "dimitris",
    name: "Δημήτρης Ιωάννου",
    roleLabel: "Διαχείριση",
    skill: "κάμερα",
  },
  {
    id: "aris",
    name: "Άρης Κωνσταντίνου",
    roleLabel: "Παραγωγή",
    skill: "κάμερα, μοντάζ",
  },
  {
    id: "sofia",
    name: "Σοφία Λαζαρίδου",
    roleLabel: "Παραγωγή",
    skill: "φως, ήχος",
  },
  {
    id: "anna",
    name: "Άννα Δημητρίου",
    roleLabel: "Πωλήσεις",
    skill: "παραγωγή επί τόπου",
  },
];

export const PERSON_OF_ROLE: Readonly<Partial<Record<RoleId, string>>> = {
  owner: "giorgos",
  admin: "dimitris",
  production: "aris",
  sales: "anna",
};

export const personName = (id: string): string =>
  CREW_PEOPLE.find((person) => person.id === id)?.name ?? "—";

// Η ταυτότητα της Παραγωγής: μία ανά Περίοδο στη μηνιαία, μία ανά εφάπαξ, και οι Εσωτερικές (clientId και agreementId κενά).
// Τα υπόλοιπα (κατάσταση, εργασίες, Παραδοτέα, ώρες) ζουν στο productions.ts του module «Παραγωγές».
export interface ProductionStub {
  id: string;
  title: string;
  clientId: string;
  agreementId: string;
  periodLabel: string | null;
  ownerId: string;
  memberIds: readonly string[];
}

export const PRODUCTIONS: readonly ProductionStub[] = [
  {
    id: "pr-kypseli-07",
    title: "Κυψέλη Καφέ — Ιούλιος 2026",
    clientId: "kypseli",
    agreementId: "ag-kypseli-social",
    periodLabel: "Ιούλιος 2026",
    ownerId: "aris",
    memberIds: ["aris", "sofia"],
  },
  {
    id: "pr-kypseli-08",
    title: "Κυψέλη Καφέ — Αύγουστος 2026",
    clientId: "kypseli",
    agreementId: "ag-kypseli-social",
    periodLabel: "Αύγουστος 2026",
    ownerId: "aris",
    memberIds: ["aris", "sofia"],
  },
  {
    id: "pr-kinisi-08",
    title: "Γυμναστήριο Κίνηση — Αύγουστος 2026",
    clientId: "kinisi",
    agreementId: "ag-kinisi-social",
    periodLabel: "Αύγουστος 2026",
    ownerId: "aris",
    memberIds: ["aris"],
  },
  {
    id: "pr-armyra-2025",
    title: "Ταβέρνα Αρμύρα — Εταιρικό βίντεο",
    clientId: "armyra",
    agreementId: "ag-armyra-2025",
    periodLabel: null,
    ownerId: "sofia",
    memberIds: ["sofia", "aris"],
  },
  {
    id: "pr-showreel-2026",
    title: "Showreel 2026",
    clientId: "",
    agreementId: "",
    periodLabel: null,
    ownerId: "giorgos",
    memberIds: ["giorgos", "aris"],
  },
  {
    id: "pr-kypseli-09",
    title: "Κυψέλη Καφέ — Σεπτέμβριος 2026",
    clientId: "kypseli",
    agreementId: "ag-kypseli-social",
    periodLabel: "Σεπτέμβριος 2026",
    ownerId: "aris",
    memberIds: ["aris", "sofia"],
  },
  {
    id: "pr-kypseli-10",
    title: "Κυψέλη Καφέ — Οκτώβριος 2026",
    clientId: "kypseli",
    agreementId: "ag-kypseli-social",
    periodLabel: "Οκτώβριος 2026",
    ownerId: "aris",
    memberIds: ["aris", "sofia"],
  },
  {
    id: "pr-kinisi-09",
    title: "Γυμναστήριο Κίνηση — Σεπτέμβριος 2026",
    clientId: "kinisi",
    agreementId: "ag-kinisi-social",
    periodLabel: "Σεπτέμβριος 2026",
    ownerId: "aris",
    memberIds: ["aris"],
  },
  {
    id: "pr-athina-09",
    title: "Καφέ Αθηνά — 5–30 Σεπτεμβρίου 2026",
    clientId: "athina",
    agreementId: "ag-athina-social",
    periodLabel: "5–30 Σεπτεμβρίου 2026",
    ownerId: "sofia",
    memberIds: ["sofia", "dimitris"],
  },
  {
    id: "pr-athina-10",
    title: "Καφέ Αθηνά — Οκτώβριος 2026",
    clientId: "athina",
    agreementId: "ag-athina-social",
    periodLabel: "Οκτώβριος 2026",
    ownerId: "sofia",
    memberIds: ["sofia", "dimitris"],
  },
];

export const findProduction = (id: string): ProductionStub | undefined =>
  PRODUCTIONS.find((production) => production.id === id);

export type CrewResponse = "αναμένει" | "επιβεβαιώνω" | "δεν μπορώ";

export interface CrewSlot {
  personId: string;
  response: CrewResponse;
  reason?: string;
}

export interface SheetVersion {
  version: number;
  sentAt: string;
  change: string;
}

export interface Filming {
  id: string;
  productionId: string;
  date: string;
  start: string;
  hours: number;
  location: string;
  state: FilmingState;
  origin: "κράτηση πελάτη" | "ομάδα" | "Κλεισμένος χρόνος";
  createdBy: string;
  createdAt: string;
  crew: readonly CrewSlot[];
  // ids του μητρώου (equipment.ts)
  equipment: readonly string[];
  shotList: readonly string[];
  internalNote?: string;
  clientNote?: string;
  sheet: readonly SheetVersion[];
  approval?: { by: string; when: string; automatic?: boolean };
  rejection?: { by: string; when: string; reason: string };
  cancellation?: {
    by: string;
    when: string;
    reason: string;
    side: "πελάτης" | "ομάδα";
    burns: boolean;
  };
  cancelRequest?: { by: string; when: string; reason: string };
  outcome?: { by: string; when: string; actualHours?: number };
}

export const FILMINGS: readonly Filming[] = [
  {
    id: "f-kypseli-0709",
    productionId: "pr-kypseli-07",
    date: "2026-07-09",
    start: "10:00",
    hours: 3,
    location: "Κυψέλη Καφέ, Πλατεία Αγίας Σοφίας 1, Θεσσαλονίκη",
    state: "έγινε",
    origin: "κράτηση πελάτη",
    createdBy: "Μαρία Παπαδάκη",
    createdAt: "2026-07-02",
    crew: [
      { personId: "aris", response: "επιβεβαιώνω" },
      { personId: "sofia", response: "επιβεβαιώνω" },
    ],
    equipment: ["eq-cam-a", "eq-led-kit"],
    shotList: ["Καλοκαιρινά ροφήματα", "Η μπάρα το πρωί"],
    sheet: [{ version: 1, sentAt: "2026-07-06", change: "Πρώτη αποστολή" }],
    approval: { by: "Δημήτρης Ιωάννου", when: "2026-07-02" },
    outcome: { by: "Άρης Κωνσταντίνου", when: "2026-07-09", actualHours: 3 },
  },
  {
    id: "f-kypseli-0806",
    productionId: "pr-kypseli-08",
    date: "2026-08-06",
    start: "10:00",
    hours: 3,
    location: "Κυψέλη Καφέ, Πλατεία Αγίας Σοφίας 1, Θεσσαλονίκη",
    state: "έγινε",
    origin: "κράτηση πελάτη",
    createdBy: "Μαρία Παπαδάκη",
    createdAt: "2026-07-30",
    crew: [
      { personId: "aris", response: "επιβεβαιώνω" },
      { personId: "sofia", response: "επιβεβαιώνω" },
    ],
    equipment: ["eq-cam-a", "eq-led-kit"],
    shotList: ["Παγωμένοι καφέδες", "Τρία reels στη βεράντα"],
    sheet: [{ version: 1, sentAt: "2026-08-03", change: "Πρώτη αποστολή" }],
    approval: { by: "Δημήτρης Ιωάννου", when: "2026-07-30" },
    outcome: { by: "Άρης Κωνσταντίνου", when: "2026-08-06", actualHours: 3 },
  },
  {
    id: "f-kypseli-0818",
    productionId: "pr-kypseli-08",
    date: "2026-08-18",
    start: "11:00",
    hours: 2,
    location: "Κυψέλη Καφέ, Πλατεία Αγίας Σοφίας 1, Θεσσαλονίκη",
    state: "έγινε",
    origin: "κράτηση πελάτη",
    createdBy: "Μαρία Παπαδάκη",
    createdAt: "2026-08-12",
    crew: [
      { personId: "aris", response: "επιβεβαιώνω" },
      { personId: "sofia", response: "επιβεβαιώνω" },
    ],
    equipment: ["eq-cam-a", "eq-led-kit"],
    shotList: ["Νέο brunch μενού"],
    sheet: [{ version: 1, sentAt: "2026-08-14", change: "Πρώτη αποστολή" }],
    approval: { by: "Δημήτρης Ιωάννου", when: "2026-08-12" },
    outcome: { by: "Άρης Κωνσταντίνου", when: "2026-08-18", actualHours: 2 },
  },
  {
    id: "f-kypseli-0827",
    productionId: "pr-kypseli-08",
    date: "2026-08-27",
    start: "10:00",
    hours: 3,
    location: "Κυψέλη Καφέ, Πλατεία Αγίας Σοφίας 1, Θεσσαλονίκη",
    state: "έγινε",
    origin: "κράτηση πελάτη",
    createdBy: "Μαρία Παπαδάκη",
    createdAt: "2026-08-21",
    crew: [
      { personId: "aris", response: "επιβεβαιώνω" },
      { personId: "sofia", response: "επιβεβαιώνω" },
    ],
    equipment: ["eq-cam-a", "eq-led-kit"],
    shotList: ["Τέλος καλοκαιριού: πλάνα του χώρου", "Δύο reels με τη Μαρία"],
    sheet: [{ version: 1, sentAt: "2026-08-24", change: "Πρώτη αποστολή" }],
    approval: { by: "Δημήτρης Ιωάννου", when: "2026-08-21" },
    outcome: { by: "Άρης Κωνσταντίνου", when: "2026-08-27", actualHours: 3 },
  },
  {
    id: "f-kypseli-0908",
    productionId: "pr-kypseli-09",
    date: "2026-09-08",
    start: "10:00",
    hours: 3,
    location: "Κυψέλη Καφέ, Πλατεία Αγίας Σοφίας 1, Θεσσαλονίκη",
    state: "έγινε",
    origin: "κράτηση πελάτη",
    createdBy: "Μαρία Παπαδάκη",
    createdAt: "2026-09-01",
    crew: [
      { personId: "aris", response: "επιβεβαιώνω" },
      { personId: "sofia", response: "επιβεβαιώνω" },
    ],
    equipment: ["eq-cam-a", "eq-led-kit"],
    shotList: [
      "Πρωινός καφές στη μπάρα",
      "Νέο φθινοπωρινό μενού",
      "Δύο reels με τη Μαρία",
    ],
    sheet: [{ version: 1, sentAt: "2026-09-03", change: "Πρώτη αποστολή" }],
    approval: { by: "Δημήτρης Ιωάννου", when: "2026-09-01" },
    outcome: { by: "Άρης Κωνσταντίνου", when: "2026-09-08", actualHours: 3 },
  },
  {
    id: "f-kypseli-0915",
    productionId: "pr-kypseli-09",
    date: "2026-09-15",
    start: "17:00",
    hours: 2,
    location: "Κυψέλη Καφέ, Πλατεία Αγίας Σοφίας 1, Θεσσαλονίκη",
    state: "απορρίφθηκε",
    origin: "κράτηση πελάτη",
    createdBy: "Νίκος Σταυρίδης",
    createdAt: "2026-09-12",
    crew: [],
    equipment: [],
    shotList: [],
    sheet: [],
    rejection: {
      by: "Δημήτρης Ιωάννου",
      when: "2026-09-12",
      reason:
        "Το κατάστημα έχει απογευματινή εκδήλωση· προτείναμε Πέμπτη 24/9.",
    },
  },
  {
    id: "f-kypseli-0924",
    productionId: "pr-kypseli-09",
    date: "2026-09-24",
    start: "10:00",
    hours: 3,
    location: "Κυψέλη Καφέ, Πλατεία Αγίας Σοφίας 1, Θεσσαλονίκη",
    state: "αναμένει έγκριση",
    origin: "κράτηση πελάτη",
    createdBy: "Μαρία Παπαδάκη",
    createdAt: "2026-09-19",
    crew: [],
    equipment: [],
    shotList: [],
    sheet: [],
    clientNote: "Θέλουμε πλάνα με το νέο γλυκό της εβδομάδας.",
  },
  {
    id: "f-kypseli-1002",
    productionId: "pr-kypseli-10",
    date: "2026-10-02",
    start: "09:00",
    hours: 4,
    location: "Κυψέλη Καφέ, Πλατεία Αγίας Σοφίας 1, Θεσσαλονίκη",
    state: "προγραμματισμένο",
    origin: "ομάδα",
    createdBy: "Άννα Δημητρίου",
    createdAt: "2026-09-16",
    crew: [
      { personId: "aris", response: "επιβεβαιώνω" },
      {
        personId: "sofia",
        response: "δεν μπορώ",
        reason: "Έχω εξετάσεις στο νοσοκομείο το πρωί.",
      },
    ],
    equipment: ["eq-cam-a", "eq-gimbal", "eq-mics"],
    shotList: [
      "Ο χώρος πριν ανοίξει",
      "Συνέντευξη με τη Μαρία (2΄)",
      "Λεπτομέρειες στη βιτρίνα",
    ],
    internalNote: "Πάρκινγκ πίσω από το κατάστημα.",
    sheet: [
      { version: 1, sentAt: "2026-09-16", change: "Πρώτη αποστολή" },
      {
        version: 2,
        sentAt: "2026-09-18",
        change: "Αλλαγή ώρας έναρξης: 09:00",
      },
    ],
  },
  {
    id: "f-kinisi-0903",
    productionId: "pr-kinisi-09",
    date: "2026-09-03",
    start: "18:00",
    hours: 2,
    location: "Γυμναστήριο Κίνηση, Λεωφ. Αλεξάνδρας 10, Αθήνα",
    state: "έγινε",
    origin: "κράτηση πελάτη",
    createdBy: "Σταύρος Μπαλτάς",
    createdAt: "2026-08-28",
    crew: [{ personId: "aris", response: "επιβεβαιώνω" }],
    equipment: ["eq-cam-b", "eq-gimbal"],
    shotList: ["Ομαδικό πρόγραμμα 18:00", "Συνέντευξη προπονητή"],
    sheet: [{ version: 1, sentAt: "2026-08-31", change: "Πρώτη αποστολή" }],
    approval: { by: "Δημήτρης Ιωάννου", when: "2026-08-28" },
    outcome: { by: "Άρης Κωνσταντίνου", when: "2026-09-03", actualHours: 2 },
  },
  {
    id: "f-kinisi-0912",
    productionId: "pr-kinisi-09",
    date: "2026-09-12",
    start: "11:00",
    hours: 2,
    location: "Γυμναστήριο Κίνηση, Λεωφ. Αλεξάνδρας 10, Αθήνα",
    state: "ακυρώθηκε",
    origin: "κράτηση πελάτη",
    createdBy: "Σταύρος Μπαλτάς",
    createdAt: "2026-09-02",
    crew: [],
    equipment: [],
    shotList: [],
    sheet: [],
    approval: { by: "Δημήτρης Ιωάννου", when: "2026-09-02" },
    cancellation: {
      by: "Σταύρος Μπαλτάς",
      when: "2026-09-07",
      reason: "Κλειστά για ανακαίνιση εκείνο το Σάββατο.",
      side: "πελάτης",
      burns: false,
    },
  },
  {
    id: "f-kinisi-0918",
    productionId: "pr-kinisi-09",
    date: "2026-09-18",
    start: "10:00",
    hours: 3,
    location: "Γυμναστήριο Κίνηση, Λεωφ. Αλεξάνδρας 10, Αθήνα",
    state: "προγραμματισμένο",
    origin: "κράτηση πελάτη",
    createdBy: "Σταύρος Μπαλτάς",
    createdAt: "2026-09-08",
    crew: [
      { personId: "aris", response: "επιβεβαιώνω" },
      { personId: "dimitris", response: "επιβεβαιώνω" },
    ],
    equipment: ["eq-cam-a", "eq-led-kit"],
    shotList: ["Νέα αίθουσα crossfit", "Τρία reels με ασκήσεις"],
    sheet: [{ version: 1, sentAt: "2026-09-14", change: "Πρώτη αποστολή" }],
    approval: { by: "Δημήτρης Ιωάννου", when: "2026-09-08" },
  },
  {
    id: "f-kinisi-0921",
    productionId: "pr-kinisi-09",
    date: "2026-09-21",
    start: "17:00",
    hours: 2,
    location: "Γυμναστήριο Κίνηση, Λεωφ. Αλεξάνδρας 10, Αθήνα",
    state: "προγραμματισμένο",
    origin: "κράτηση πελάτη",
    createdBy: "Σταύρος Μπαλτάς",
    createdAt: "2026-09-10",
    crew: [{ personId: "aris", response: "αναμένει" }],
    equipment: ["eq-cam-b", "eq-drone"],
    shotList: ["Βραδινό πρόγραμμα"],
    sheet: [{ version: 1, sentAt: "2026-09-17", change: "Πρώτη αποστολή" }],
    approval: { by: "Δημήτρης Ιωάννου", when: "2026-09-10" },
    cancelRequest: {
      by: "Σταύρος Μπαλτάς",
      when: "2026-09-20",
      reason: "Ο προπονητής αρρώστησε.",
    },
  },
  {
    id: "f-athina-0910",
    productionId: "pr-athina-09",
    date: "2026-09-10",
    start: "12:00",
    hours: 3,
    location: "Καφέ Αθηνά, Ερμού 20, Αθήνα",
    state: "έγινε",
    origin: "κράτηση πελάτη",
    createdBy: "Μαρία Σιμιτζή",
    createdAt: "2026-09-06",
    crew: [
      { personId: "sofia", response: "επιβεβαιώνω" },
      { personId: "dimitris", response: "επιβεβαιώνω" },
    ],
    equipment: ["eq-cam-a"],
    shotList: ["Brunch"],
    sheet: [{ version: 1, sentAt: "2026-09-08", change: "Πρώτη αποστολή" }],
    approval: { by: "Δημήτρης Ιωάννου", when: "2026-09-06" },
    outcome: { by: "Σοφία Λαζαρίδου", when: "2026-09-10", actualHours: 3.5 },
  },
  {
    id: "f-athina-0917",
    productionId: "pr-athina-09",
    date: "2026-09-17",
    start: "09:00",
    hours: 2,
    location: "Καφέ Αθηνά, Ερμού 20, Αθήνα",
    state: "δεν έγινε",
    origin: "κράτηση πελάτη",
    createdBy: "Μαρία Σιμιτζή",
    createdAt: "2026-09-11",
    crew: [{ personId: "sofia", response: "επιβεβαιώνω" }],
    equipment: ["eq-cam-b"],
    shotList: ["Πρωινό"],
    sheet: [{ version: 1, sentAt: "2026-09-14", change: "Πρώτη αποστολή" }],
    approval: { by: "Δημήτρης Ιωάννου", when: "2026-09-11" },
    outcome: { by: "Σοφία Λαζαρίδου", when: "2026-09-17" },
  },
  {
    id: "f-athina-1002",
    productionId: "pr-athina-10",
    date: "2026-10-02",
    start: "11:00",
    hours: 3,
    location: "Καφέ Αθηνά, Ερμού 20, Αθήνα",
    state: "προγραμματισμένο",
    origin: "Κλεισμένος χρόνος",
    createdBy: "Δημήτρης Ιωάννου",
    createdAt: "2026-09-18",
    crew: [{ personId: "dimitris", response: "επιβεβαιώνω" }],
    equipment: ["eq-cam-a"],
    shotList: ["Νέο φθινοπωρινό μενού"],
    sheet: [],
    internalNote:
      "Ήταν «Συνάντηση με Καφέ Αθηνά» στο Εταιρικό ημερολόγιο· μετατράπηκε σε Γύρισμα.",
  },
];

export const findFilming = (id: string | undefined): Filming | undefined =>
  FILMINGS.find((filming) => filming.id === id);

export interface CrewTemplate {
  id: string;
  name: string;
  personIds: readonly string[];
  note: string;
  uses: number;
}

export const CREW_TEMPLATES: readonly CrewTemplate[] = [
  {
    id: "ct-social",
    name: "Social: δύο άτομα",
    personIds: ["aris", "sofia"],
    note: "Κάμερα και φως για μηνιαία social.",
    uses: 14,
  },
  {
    id: "ct-solo",
    name: "Γρήγορο reel: ένα άτομο",
    personIds: ["aris"],
    note: "Ένα άτομο με gimbal.",
    uses: 6,
  },
  {
    id: "ct-big",
    name: "Εγκαίνια ή εκδήλωση",
    personIds: ["giorgos", "aris", "sofia", "dimitris"],
    note: "Σκηνοθεσία και δύο κάμερες.",
    uses: 2,
  },
];

// Κλεισμένος χρόνος: μπλοκάρει τη διαθεσιμότητα ενός ατόμου στην ανάθεση, όχι τη Χωρητικότητα του πελάτη.
// Ένα γεγονός του Google με δύο προσκεκλημένους γίνεται δύο εγγραφές με το ίδιο googleEventId.
// Ολοήμερο (π.χ. άδεια): from 00:00, to 24:00, και untilDate για περισσότερες μέρες.
export interface BlockedTime {
  id: string;
  personId: string;
  date: string;
  untilDate?: string;
  from: string;
  to: string;
  label: string;
  source: "DMS" | "Google";
  createdBy: string;
  googleEventId?: string;
}

export const BLOCKED_TIMES: readonly BlockedTime[] = [
  {
    id: "bt-sofia-1002",
    personId: "sofia",
    date: "2026-10-02",
    from: "08:00",
    to: "12:00",
    label: "Εξετάσεις",
    source: "DMS",
    createdBy: "sofia",
  },
  {
    id: "bt-aris-0924",
    personId: "aris",
    date: "2026-09-24",
    from: "09:00",
    to: "11:00",
    label: "Οδοντίατρος",
    source: "DMS",
    createdBy: "aris",
  },
  {
    id: "bt-dimitris-1009",
    personId: "dimitris",
    date: "2026-10-09",
    from: "10:00",
    to: "13:00",
    label: "Συνάντηση με Καφέ Αθηνά",
    source: "Google",
    createdBy: "dimitris",
    googleEventId: "g-athina-meeting",
  },
  {
    id: "bt-giorgos-0922",
    personId: "giorgos",
    date: "2026-09-22",
    from: "15:00",
    to: "16:30",
    label: "Συνάντηση με προμηθευτή",
    source: "Google",
    createdBy: "dimitris",
    googleEventId: "g-supplier",
  },
  {
    id: "bt-dimitris-0922",
    personId: "dimitris",
    date: "2026-09-22",
    from: "15:00",
    to: "16:30",
    label: "Συνάντηση με προμηθευτή",
    source: "Google",
    createdBy: "dimitris",
    googleEventId: "g-supplier",
  },
  {
    id: "bt-anna-0923",
    personId: "anna",
    date: "2026-09-23",
    from: "11:00",
    to: "12:00",
    label: "Ραντεβού με υποψήφιο Πελάτη",
    source: "DMS",
    createdBy: "anna",
  },
  {
    id: "bt-sofia-leave",
    personId: "sofia",
    date: "2026-10-12",
    untilDate: "2026-10-14",
    from: "00:00",
    to: "24:00",
    label: "Άδεια",
    source: "DMS",
    createdBy: "dimitris",
  },
];

export const findBlockedTime = (id: string | undefined): BlockedTime | undefined =>
  BLOCKED_TIMES.find((blocked) => blocked.id === id);
