// Φανταστικά δεδομένα του module «16 Ομάδα και Πρόσβαση»: Δικαιώματα, Ρόλοι, Χρήστες ομάδας, προσκλήσεις,
// Χρήστες πελάτη, αιτήματα GDPR, ενσωματώσεις και συνδρομές. Repo public: μόνο επινοημένα στοιχεία, email @example.com.
// Πηγές: κεφ. 1 «Ρόλοι και Δικαιώματα» (και «Ομάδα και Πρόσβαση: λεπτομέρειες κανόνων»), ADR 0001, ADR 0007, ADR 0016.

export type Scope = "Ό" | "Α";
export type RoleKind = "ομάδας" | "πελάτη";

export interface PermissionDef {
  id: string;
  area: string;
  label: string;
  kind: RoleKind;
  // Τα Εύρη που υποστηρίζει. Τα Δικαιώματα πελάτη δεν έχουν Εύρος: καλύπτουν τον επιλεγμένο Πελάτη.
  scopes: readonly Scope[];
}

const team = (
  id: string,
  area: string,
  label: string,
  scopes: readonly Scope[] = ["Ό", "Α"],
): PermissionDef => ({ id, area, label, kind: "ομάδας", scopes });
const client = (id: string, label: string): PermissionDef => ({
  id,
  area: "Πελάτης",
  label,
  kind: "πελάτη",
  scopes: [],
});
const ALL: readonly Scope[] = ["Ό"];

// Ο σταθερός κατάλογος (αλλάζει μόνο με αλλαγή του συστήματος). Τα «μόνο Ιδιοκτήτης» δεν είναι εδώ: δεν δίνονται.
export const PERMISSIONS: readonly PermissionDef[] = [
  team("clients.view", "Πελάτες και Πωλήσεις", "Βλέπει Πελάτες"),
  team(
    "clients.manage",
    "Πελάτες και Πωλήσεις",
    "Διαχειρίζεται Πελάτες και Ευκαιρίες",
  ),
  team("clients.transfer", "Πελάτες και Πωλήσεις", "Μεταβιβάζει Υπεύθυνο", ALL),
  team("clients.merge", "Πελάτες και Πωλήσεις", "Συγχωνεύει Πελάτες", ALL),
  team("catalogue.view", "Κατάλογος", "Βλέπει Κατάλογο", ALL),
  team("catalogue.manage", "Κατάλογος", "Διαχειρίζεται Κατάλογο", ALL),
  team("agreements.view", "Συμφωνίες", "Βλέπει Συμφωνίες"),
  team("agreements.draft", "Συμφωνίες", "Συντάσσει προτάσεις"),
  team("agreements.deviate", "Συμφωνίες", "Παρεκκλίνει από τον Κατάλογο", ALL),
  team("agreements.terminate", "Συμφωνίες", "Λύει Συμφωνία", ALL),
  team("filming.view", "Γυρίσματα", "Βλέπει Γυρίσματα"),
  team("filming.book", "Γυρίσματα", "Κλείνει Γύρισμα"),
  team("filming.approve", "Γυρίσματα", "Εγκρίνει κράτηση", ALL),
  team("filming.crew", "Γυρίσματα", "Διαχειρίζεται Συνεργείο και Δελτίο"),
  team("equipment.view", "Εξοπλισμός", "Βλέπει Εξοπλισμό", ALL),
  team("equipment.manage", "Εξοπλισμός", "Διαχειρίζεται απόθεμα", ALL),
  team("equipment.reserve", "Εξοπλισμός", "Δεσμεύει εξοπλισμό"),
  team(
    "calendar.availability",
    "Ημερολόγιο",
    "Βλέπει διαθεσιμότητα ομάδας",
    ALL,
  ),
  team("calendar.google", "Ημερολόγιο", "Αμφίδρομο ημερολόγιο Google", ALL),
  team(
    "productions.manage",
    "Παραγωγές",
    "Βλέπει, διαχειρίζεται, παραδίδει χειροκίνητα",
  ),
  team(
    "deliverables.work",
    "Παραδοτέα",
    "Βλέπει, ανεβάζει και στέλνει Έκδοση, ακυρώνει",
  ),
  team("deliverables.review", "Παραδοτέα", "Ελέγχει Παραδοτέα", ALL),
  team("finance.view", "Οικονομικά", "Βλέπει Οικονομικά", ALL),
  team("finance.amounts", "Οικονομικά", "Βλέπει ποσά"),
  team("finance.receipts", "Οικονομικά", "Καταχωρεί Εισπράξεις", ALL),
  team("finance.invoices", "Οικονομικά", "Καταχωρεί Τιμολόγια", ALL),
  team("finance.cost", "Οικονομικά", "Βλέπει κόστος και κερδοφορία", ALL),
  team("finance.costManage", "Οικονομικά", "Διαχειρίζεται κόστος", ALL),
  team("messages.chat", "Μηνύματα", "Συνομιλεί με πελάτη"),
  team(
    "automations.manage",
    "Αυτοματισμοί",
    "Διαχειρίζεται Αυτοματισμούς και Μηνύματα συστήματος",
    ALL,
  ),
  team("knowledge.manage", "Γνώση", "Διαχειρίζεται Γνώση", ALL),
  team("reports.view", "Αναφορές", "Βλέπει Αναφορές"),
  team("reports.export", "Αναφορές", "Εξάγει δεδομένα", ALL),
  team("website.manage", "Ιστοσελίδα", "Διαχειρίζεται Ιστοσελίδα", ALL),
  team(
    "access.team",
    "Ομάδα και Πρόσβαση",
    "Προσκαλεί και απενεργοποιεί Χρήστες ομάδας",
    ALL,
  ),
  team(
    "access.clientUsers",
    "Ομάδα και Πρόσβαση",
    "Προσκαλεί και αφαιρεί Χρήστες πελάτη",
  ),
  team("settings.manage", "Ρυθμίσεις", "Διαχειρίζεται Ρυθμίσεις", ALL),
  team("audit.view", "Διατομεακά", "Βλέπει ίχνος ενεργειών", ALL),
  team("health.view", "Διατομεακά", "Βλέπει Υγεία συστήματος", ALL),
  client("c.agreements", "Βλέπει Συμφωνίες"),
  client("c.sign", "Υπογράφει Συμφωνία (όταν είναι ο Υπογράφων)"),
  client("c.book", "Κλείνει Γύρισμα"),
  client("c.productions", "Βλέπει Παραγωγές"),
  client("c.approve", "Σχολιάζει και εγκρίνει Εκδόσεις"),
  client("c.finance", "Βλέπει Οικονομικά"),
  client("c.chatRead", "Βλέπει Συνομιλία"),
  client("c.chatWrite", "Γράφει στη Συνομιλία"),
  client("c.colleagues", "Προσκαλεί και αφαιρεί συναδέλφους"),
];

// Όσα κάνει μόνο ο Ιδιοκτήτης: δεν είναι Δικαιώματα και δεν δίνονται σε κανέναν άλλον Ρόλο.
export const OWNER_ONLY: readonly string[] = [
  "Αλλάζει Ρόλους (νέοι Ρόλοι, Δικαιώματα και Εύρος)",
  "Δίνει ή αφαιρεί τον Ρόλο Ιδιοκτήτης",
  "Συνδρομές και ενσωματώσεις",
  "ΑΦΜ, ΔΟΥ, ΓΕΜΗ, λογαριασμοί τραπέζης, ΦΠΑ",
  "Πλαφόν δαπάνης AI",
  "Αιτήματα GDPR: εξαγωγή και ανωνυμοποίηση",
];

export interface RoleDef {
  id: string;
  name: string;
  kind: RoleKind;
  isOwner: boolean;
  isBuiltIn: boolean;
  description: string;
  grants: Readonly<Record<string, Scope>>;
}

const everything = (kind: RoleKind): Record<string, Scope> =>
  Object.fromEntries(
    PERMISSIONS.filter((p) => p.kind === kind).map((p) => [p.id, "Ό"]),
  );
const without = (
  grants: Record<string, Scope>,
  ids: readonly string[],
): Record<string, Scope> =>
  Object.fromEntries(
    Object.entries(grants).filter(([id]) => !ids.includes(id)),
  );

export const ROLE_DEFS: readonly RoleDef[] = [
  {
    id: "owner",
    name: "Ιδιοκτήτης",
    kind: "ομάδας",
    isOwner: true,
    isBuiltIn: true,
    description:
      "Έχει πάντα όλα τα Δικαιώματα και ό,τι κάνει μόνο ο Ιδιοκτήτης. Δεν αλλάζει και δεν διαγράφεται.",
    grants: everything("ομάδας"),
  },
  {
    id: "admin",
    name: "Διαχείριση",
    kind: "ομάδας",
    isOwner: false,
    isBuiltIn: true,
    description: "Τρέχει την καθημερινή λειτουργία, με Εύρος «όλα».",
    grants: without(everything("ομάδας"), [
      "finance.invoices",
      "finance.costManage",
    ]),
  },
  {
    id: "production",
    name: "Παραγωγή",
    kind: "ομάδας",
    isOwner: false,
    isBuiltIn: true,
    description: "Γυρίζει, μοντάρει, παραδίδει, για όσα τον αφορούν.",
    grants: {
      "filming.view": "Α",
      "filming.crew": "Α",
      "equipment.view": "Ό",
      "equipment.reserve": "Α",
      "calendar.availability": "Ό",
      "productions.manage": "Α",
      "deliverables.work": "Α",
      "messages.chat": "Α",
    },
  },
  {
    id: "sales",
    name: "Πωλήσεις",
    kind: "ομάδας",
    isOwner: false,
    isBuiltIn: true,
    description: "Φέρνει πελάτες και κλείνει Συμφωνίες, για όσα τον αφορούν.",
    grants: {
      "clients.view": "Α",
      "clients.manage": "Α",
      "catalogue.view": "Ό",
      "agreements.view": "Α",
      "agreements.draft": "Α",
      "filming.view": "Α",
      "filming.book": "Α",
      "calendar.availability": "Ό",
      "finance.amounts": "Α",
      "messages.chat": "Α",
      "reports.view": "Α",
    },
  },
  {
    id: "accountant",
    name: "Λογιστής",
    kind: "ομάδας",
    isOwner: false,
    isBuiltIn: true,
    description: "Ελέγχει και εξάγει τα οικονομικά. Μόνο ανάγνωση.",
    grants: {
      "clients.view": "Ό",
      "agreements.view": "Ό",
      "finance.view": "Ό",
      "finance.amounts": "Ό",
      "reports.view": "Ό",
      "reports.export": "Ό",
    },
  },
  {
    id: "events",
    name: "Εκδηλώσεις",
    kind: "ομάδας",
    isOwner: false,
    isBuiltIn: false,
    description:
      "Φτιαγμένος από τον Ιδιοκτήτη: βλέπει όλα τα Γυρίσματα της εταιρείας.",
    grants: { "filming.view": "Ό" },
  },
  {
    id: "client-full",
    name: "Πλήρης",
    kind: "πελάτη",
    isOwner: false,
    isBuiltIn: true,
    description: "Ο άνθρωπος του Πελάτη που δουλεύει με τη Devre Media.",
    grants: everything("πελάτη"),
  },
  {
    id: "client-deliverables",
    name: "Μόνο Παραδοτέα",
    kind: "πελάτη",
    isOwner: false,
    isBuiltIn: false,
    description:
      "Φτιαγμένος από τον Ιδιοκτήτη: βλέπει Παραγωγές και εγκρίνει Εκδόσεις, χωρίς Οικονομικά.",
    grants: {
      "c.productions": "Ό",
      "c.approve": "Ό",
      "c.chatRead": "Ό",
      "c.chatWrite": "Ό",
    },
  },
];

export type UserStatus = "ενεργός" | "απενεργοποιημένος" | "ανωνυμοποιημένος";

export interface TeamUser {
  id: string;
  name: string;
  email: string;
  roleIds: readonly string[];
  status: UserStatus;
  since: string;
  lastSeen?: string;
  deactivatedAt?: string;
}

export const TEAM_USERS: readonly TeamUser[] = [
  {
    id: "giorgos",
    name: "Γιώργος Μαυρίδης",
    email: "giorgos@example.com",
    roleIds: ["owner"],
    status: "ενεργός",
    since: "2026-06-01",
    lastSeen: "2026-09-20",
  },
  {
    id: "dimitris",
    name: "Δημήτρης Ιωάννου",
    email: "dimitris@example.com",
    roleIds: ["admin"],
    status: "ενεργός",
    since: "2026-06-01",
    lastSeen: "2026-09-20",
  },
  {
    id: "aris",
    name: "Άρης Κωνσταντίνου",
    email: "aris@example.com",
    roleIds: ["production"],
    status: "ενεργός",
    since: "2026-06-03",
    lastSeen: "2026-09-19",
  },
  {
    id: "sofia",
    name: "Σοφία Λαζαρίδου",
    email: "sofia@example.com",
    roleIds: ["production", "events"],
    status: "ενεργός",
    since: "2026-06-03",
    lastSeen: "2026-09-18",
  },
  {
    id: "anna",
    name: "Άννα Δημητρίου",
    email: "anna@example.com",
    roleIds: ["sales"],
    status: "ενεργός",
    since: "2026-06-05",
    lastSeen: "2026-09-20",
  },
  {
    id: "nikos",
    name: "Νίκος Βασιλείου",
    email: "nikos.v@example.com",
    roleIds: ["sales"],
    status: "ενεργός",
    since: "2026-07-01",
    lastSeen: "2026-09-17",
  },
  {
    id: "eleni",
    name: "Ελένη Ρήγα",
    email: "eleni@example.com",
    roleIds: ["accountant"],
    status: "ενεργός",
    since: "2026-06-10",
    lastSeen: "2026-09-15",
  },
  {
    id: "petros",
    name: "Πέτρος Αλεξίου",
    email: "petros@example.com",
    roleIds: ["production"],
    status: "απενεργοποιημένος",
    since: "2026-06-03",
    deactivatedAt: "2026-08-31",
  },
];

// Τι επιστρέφει για νέα ανάθεση όταν απενεργοποιηθεί ο Χρήστης (υπολογίζεται τη στιγμή της απενεργοποίησης).
export interface OpenAssignments {
  clients: number;
  opportunities: number;
  productions: number;
  tasks: number;
  deliverables: number;
  crews: number;
}

export const OPEN_ASSIGNMENTS: Readonly<Record<string, OpenAssignments>> = {
  dimitris: {
    clients: 1,
    opportunities: 1,
    productions: 2,
    tasks: 3,
    deliverables: 1,
    crews: 2,
  },
  aris: {
    clients: 0,
    opportunities: 0,
    productions: 1,
    tasks: 4,
    deliverables: 3,
    crews: 3,
  },
  sofia: {
    clients: 0,
    opportunities: 0,
    productions: 0,
    tasks: 1,
    deliverables: 0,
    crews: 2,
  },
  anna: {
    clients: 3,
    opportunities: 4,
    productions: 0,
    tasks: 0,
    deliverables: 0,
    crews: 1,
  },
  nikos: {
    clients: 2,
    opportunities: 2,
    productions: 0,
    tasks: 0,
    deliverables: 0,
    crews: 0,
  },
};

export type InvitationKind = "ομάδας" | "πελάτη";

export interface Invitation {
  id: string;
  kind: InvitationKind;
  name: string;
  email: string;
  roleIds: readonly string[];
  clientId?: string;
  // Ποιος προσκάλεσε: id μέλους ομάδας, email Χρήστη πελάτη, ή «system» για τον Υπογράφοντα.
  invitedBy: string;
  sentAt: string;
  expiresAt: string;
}

// Ο σύνδεσμος ισχύει 7 μέρες· μετά φαίνεται «έληξε» και θέλει Επαναποστολή.
export const INVITATIONS: readonly Invitation[] = [
  {
    id: "inv-katerina",
    kind: "ομάδας",
    name: "Κατερίνα Μιχαηλίδου",
    email: "katerina@example.com",
    roleIds: ["production"],
    invitedBy: "dimitris",
    sentAt: "2026-09-17",
    expiresAt: "2026-09-24",
  },
  {
    id: "inv-lefteris",
    kind: "ομάδας",
    name: "Λευτέρης Γεωργίου",
    email: "lefteris@example.com",
    roleIds: ["sales"],
    invitedBy: "giorgos",
    sentAt: "2026-09-05",
    expiresAt: "2026-09-12",
  },
  {
    id: "inv-chara",
    kind: "πελάτη",
    name: "Χαρά Τσολάκη",
    email: "chara@example.com",
    roleIds: ["client-full"],
    clientId: "kypseli",
    invitedBy: "maria@example.com",
    sentAt: "2026-09-19",
    expiresAt: "2026-09-26",
  },
  {
    id: "inv-meli",
    kind: "πελάτη",
    name: "Ελπίδα Κουρή",
    email: "elpida@example.com",
    roleIds: ["client-full"],
    clientId: "meli",
    invitedBy: "system",
    sentAt: "2026-09-12",
    expiresAt: "2026-09-19",
  },
];

// Στοιχεία των Χρηστών πελάτη πέρα από όσα έχει ο Πελάτης (sales.ts): Ρόλος ανά Πελάτη, ποιος προσκάλεσε, άλλοι Πελάτες.
export interface ClientMembership {
  email: string;
  clientId: string;
  roleId: string;
  invitedBy: string;
  joinedAt: string;
  lastSeen?: string;
}

export const CLIENT_MEMBERSHIPS: readonly ClientMembership[] = [
  {
    email: "maria@example.com",
    clientId: "kypseli",
    roleId: "client-full",
    invitedBy: "system",
    joinedAt: "2026-06-24",
    lastSeen: "2026-09-19",
  },
  {
    email: "nikos@example.com",
    clientId: "kypseli",
    roleId: "client-full",
    invitedBy: "maria@example.com",
    joinedAt: "2026-07-02",
    lastSeen: "2026-09-12",
  },
  {
    email: "nikos@example.com",
    clientId: "armyra",
    roleId: "client-full",
    invitedBy: "dimitris",
    joinedAt: "2026-08-20",
    lastSeen: "2026-09-10",
  },
  {
    email: "stavros@example.com",
    clientId: "kinisi",
    roleId: "client-full",
    invitedBy: "system",
    joinedAt: "2026-05-30",
  },
  {
    email: "kostas@example.com",
    clientId: "armyra",
    roleId: "client-full",
    invitedBy: "system",
    joinedAt: "2025-03-14",
  },
  {
    email: "info@athina.example.com",
    clientId: "athina",
    roleId: "client-full",
    invitedBy: "system",
    joinedAt: "2026-04-02",
  },
];

// Ο Χρήστης πελάτη του prototype (ρόλος «Πλήρης»).
export const CURRENT_CLIENT_USER = "maria@example.com";
export const CURRENT_CLIENT_ID = "kypseli";

export interface GdprRequest {
  id: string;
  subject: string;
  kind: "Εξαγωγή" | "Ανωνυμοποίηση";
  receivedAt: string;
  doneAt?: string;
  by: string;
}

// Στο Ίχνος μένει μόνο το είδος και η ημερομηνία, όχι το όνομα (το όνομα είναι ό,τι σβήστηκε).
export const GDPR_REQUESTS: readonly GdprRequest[] = [
  {
    id: "gdpr-1",
    subject:
      "Ανωνυμοποιημένος Χρήστης 1 (πρώην Χρήστης πελάτη, Αθήνα Αισθητική)",
    kind: "Ανωνυμοποίηση",
    receivedAt: "2026-08-28",
    doneAt: "2026-09-02",
    by: "giorgos",
  },
  {
    id: "gdpr-2",
    subject: "Κώστας Λάμπρου (Αρμυρά)",
    kind: "Εξαγωγή",
    receivedAt: "2026-09-18",
    by: "giorgos",
  },
];
