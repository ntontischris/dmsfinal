// Φανταστικά δεδομένα του module «1 Πελάτες και Πωλήσεις». Repo public: μόνο επινοημένα στοιχεία, email @example.com.
// «Σήμερα» είναι σταθερή ημερομηνία, ώστε το «ξεχασμένη» και η λήξη πρότασης να βγαίνουν ίδια σε κάθε φόρτωση.

import { FICTIONAL_CLIENT, type ClientUser } from "@/data/fictional-client";

export const TODAY = "2026-09-20";

export interface TeamMember {
  id: string;
  name: string;
  roleLabel: string;
  isSalesUser: boolean;
}

// Ο «sales» χρήστης του prototype είναι η Άννα: όταν ο ρόλος είναι Πωλήσεις, το «με αφορά» υπολογίζεται γι' αυτήν.
export const SALES_USER_ID = "anna";

export const TEAM: readonly TeamMember[] = [
  {
    id: "anna",
    name: FICTIONAL_CLIENT.owner,
    roleLabel: "Πωλήσεις",
    isSalesUser: true,
  },
  {
    id: "nikos",
    name: "Νίκος Βασιλείου",
    roleLabel: "Πωλήσεις",
    isSalesUser: false,
  },
  {
    id: "dimitris",
    name: "Δημήτρης Ιωάννου",
    roleLabel: "Διαχείριση",
    isSalesUser: false,
  },
  {
    id: "giorgos",
    name: "Γιώργος Μαυρίδης",
    roleLabel: "Ιδιοκτήτης",
    isSalesUser: false,
  },
];

export const memberName = (id: string | null): string =>
  TEAM.find((member) => member.id === id)?.name ?? "Χωρίς υπεύθυνο";

export type ClientStatus = "Υποψήφιος" | "Ενεργός" | "Ανενεργός";

export interface Activity {
  when: string;
  kind: "Κλήση" | "Email" | "Συνάντηση" | "Σημείωση" | "σύστημα";
  text: string;
  by: string;
}

export interface SalesClient {
  id: string;
  name: string;
  legalName: string;
  city: string;
  vat: string;
  status: ClientStatus;
  ownerId: string | null;
  contact: { name: string; email: string; phone: string };
  users: readonly ClientUser[];
  activities: readonly Activity[];
  possibleDuplicateOf?: { clientId: string; reason: string };
}

export const KYPSELI_ID = "kypseli";

export const SALES_CLIENTS: readonly SalesClient[] = [
  {
    id: KYPSELI_ID,
    name: FICTIONAL_CLIENT.name,
    legalName: FICTIONAL_CLIENT.legalName,
    city: FICTIONAL_CLIENT.city,
    vat: "999000001",
    status: "Ενεργός",
    ownerId: "anna",
    contact: {
      name: "Μαρία Παπαδάκη",
      email: "maria@example.com",
      phone: "2310 555 0101",
    },
    users: FICTIONAL_CLIENT.users,
    activities: [
      {
        when: "2026-09-18",
        kind: "Email",
        text: "Στάλθηκε η πρόταση «Βίντεο εγκαινίων δεύτερου καταστήματος».",
        by: "Άννα Δημητρίου",
      },
      {
        when: "2026-09-17",
        kind: "Κλήση",
        text: "Κλήση με την κ. Παπαδάκη για το δεύτερο κατάστημα.",
        by: "Άννα Δημητρίου",
      },
      {
        when: "2026-09-01",
        kind: "σύστημα",
        text: "Ξεκίνησε η Περίοδος Σεπτέμβριος 2026.",
        by: "Σύστημα",
      },
    ],
  },
  {
    id: "kinisi",
    name: "Γυμναστήριο Κίνηση",
    legalName: "Κίνηση Γυμναστήριο Μονοπρόσωπη Ι.Κ.Ε.",
    city: "Αθήνα",
    vat: "999000002",
    status: "Ενεργός",
    ownerId: "anna",
    contact: {
      name: "Σταύρος Μπαλτάς",
      email: "stavros@example.com",
      phone: "210 555 0102",
    },
    users: [
      {
        name: "Σταύρος Μπαλτάς",
        email: "stavros@example.com",
        role: "Πλήρης",
        isSignatory: true,
      },
    ],
    activities: [
      {
        when: "2026-09-11",
        kind: "Συνάντηση",
        text: "Συνάντηση για έκπτωση και έξτρα reels.",
        by: "Άννα Δημητρίου",
      },
    ],
  },
  {
    id: "meli",
    name: "Ζαχαροπλαστείο Μέλι",
    legalName: "Μέλι Ζαχαροπλαστική Ε.Ε.",
    city: "Πάτρα",
    vat: "999000003",
    status: "Υποψήφιος",
    ownerId: "anna",
    contact: {
      name: "Ελένη Ράπτη",
      email: "eleni.rapti@example.com",
      phone: "2610 555 0103",
    },
    users: [],
    activities: [
      {
        when: "2026-08-29",
        kind: "Email",
        text: "Στάλθηκε η αναθεωρημένη πρόταση, Ισχύς 14 μέρες. Έληξε στις 12/09.",
        by: "Άννα Δημητρίου",
      },
    ],
  },
  {
    id: "armyra",
    name: "Ταβέρνα Αρμύρα",
    legalName: "Αρμύρα Εστίαση Ο.Ε.",
    city: "Βόλος",
    vat: "999000004",
    status: "Ανενεργός",
    ownerId: "nikos",
    contact: {
      name: "Κώστας Λάμπρου",
      email: "kostas@example.com",
      phone: "24210 55504",
    },
    users: [
      {
        name: "Κώστας Λάμπρου",
        email: "kostas@example.com",
        role: "Πλήρης",
        isSignatory: true,
      },
      {
        name: "Νίκος Σταυρίδης",
        email: "nikos@example.com",
        role: "Πλήρης",
        isSignatory: false,
      },
    ],
    activities: [
      {
        when: "2026-09-10",
        kind: "Κλήση",
        text: "Ο πελάτης ζήτησε νέο βίντεο, σύσταση από την Κυψέλη.",
        by: "Άννα Δημητρίου",
      },
    ],
  },
  {
    id: "athina",
    name: "Καφέ Αθηνά",
    legalName: "Αθηνά Καφέ Ι.Κ.Ε.",
    city: "Αθήνα",
    vat: "999000005",
    status: "Ενεργός",
    ownerId: "nikos",
    contact: {
      name: "Μαρία Σιμιτζή",
      email: "info@athina.example.com",
      phone: "210 555 0105",
    },
    users: [
      {
        name: "Μαρία Σιμιτζή",
        email: "info@athina.example.com",
        role: "Πλήρης",
        isSignatory: true,
      },
    ],
    activities: [
      {
        when: "2026-08-27",
        kind: "σύστημα",
        text: "Καταχωρίστηκε υπογραφή εκτός συστήματος. Ο Υπογράφων προσκλήθηκε.",
        by: "Σύστημα",
      },
    ],
  },
  {
    id: "athinaion",
    name: "Καφέ Αθήναιον",
    legalName: "Αθήναιον Εστίαση Ο.Ε.",
    city: "Αθήνα",
    vat: "999000006",
    status: "Υποψήφιος",
    ownerId: null,
    contact: {
      name: "Μαρία Σιμιτζή",
      email: "maria@athinaion.example.com",
      phone: "210 555 0105",
    },
    users: [],
    activities: [
      {
        when: "2026-09-19",
        kind: "σύστημα",
        text: "Νέα Ευκαιρία από τη φόρμα. Πηγή: Ιστοσελίδα.",
        by: "Σύστημα",
      },
    ],
    possibleDuplicateOf: {
      clientId: "athina",
      reason: "Ίδιο τηλέφωνο (210 555 0105). Άλλο email και άλλο ΑΦΜ.",
    },
  },
  {
    id: "hamogelo",
    name: "Οδοντιατρείο Χαμόγελο",
    legalName: "Χαμόγελο Οδοντιατρική Μ.Ι.Κ.Ε.",
    city: "Λάρισα",
    vat: "999000007",
    status: "Υποψήφιος",
    ownerId: null,
    contact: {
      name: "Δρ. Ιωάννα Φέτση",
      email: "ioanna@example.com",
      phone: "2410 555 0107",
    },
    users: [],
    activities: [
      {
        when: "2026-09-20",
        kind: "σύστημα",
        text: "Νέα Ευκαιρία από τη φόρμα. Πηγή: Ιστοσελίδα.",
        by: "Σύστημα",
      },
    ],
  },
];

export const findClient = (id: string | undefined): SalesClient | undefined =>
  SALES_CLIENTS.find((client) => client.id === id);
