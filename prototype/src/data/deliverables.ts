// Φανταστικά δεδομένα του module «8 Παραδοτέα»: Εκδόσεις, Σχόλια Έκδοσης, εσωτερικός έλεγχος, Τελικά αρχεία,
// Αιτήματα αλλαγής μετά την έγκριση, εκκρεμείς αποφάσεις χρέωσης και Κανόνες Παραδοτέων.
// Η σύνοψη κάθε Παραδοτέου (τίτλος, είδος, Ανατεθειμένος, κατάσταση, προθεσμία, γύροι) ζει στο productions.ts.
// Repo public: μόνο επινοημένα ονόματα και links. Πηγές: κεφ. 3.5, «Λεπτομέρειες κανόνων: Παραδοτέα», ADR 0011.

import type { ProvisionKindId } from "@/data/catalogue";

export type VersionState =
  | "αναμένει εσωτερικό έλεγχο"
  | "επιστράφηκε από έλεγχο"
  | "αναμένει πελάτη"
  | "εγκρίθηκε"
  | "χρειάζεται αλλαγές"
  | "αντικαταστάθηκε";

export type LinkHost = "Google Drive" | "Vimeo" | "YouTube";

export interface VersionComment {
  id: string;
  who: string;
  isClient: boolean;
  when: string;
  text: string;
  // Χρόνος μέσα στο video, σε δευτερόλεπτα. Σε Vimeo/YouTube μπαίνει μόνος του, σε Drive τον γράφει όποιος σχολιάζει.
  at?: number;
  isInternal?: boolean;
  isBrokenLink?: boolean;
}

export interface Version {
  number: number;
  link: string;
  host: LinkHost;
  addedBy: string;
  addedAt: string;
  state: VersionState;
  review?: { by: string; when: string; note?: string };
  sentAt?: string;
  answer?: { by: string; when: string };
  linkFixedAt?: string;
  comments: readonly VersionComment[];
}

export type ChargeChoice = "χρεώνεται" | "χωρίς χρέωση";

// Γύρος πέρα από το Όριο αλλαγών: η δουλειά συνεχίζει, η χρέωση περιμένει όποιον «Βλέπει ποσά».
export interface ChargeDecision {
  round: number;
  askedAt: string;
  decided?: { choice: ChargeChoice; by: string; when: string; reason?: string };
}

export type PostApprovalChoice =
  "δεκτό ως γύρος" | "χρεώνεται" | "νέο Παραδοτέο";

export interface PostApprovalRequest {
  id: string;
  by: string;
  when: string;
  text: string;
  decided?: { choice: PostApprovalChoice; by: string; when: string };
}

export interface DeliverableDetail {
  id: string;
  // Το Γύρισμα από το οποίο μετρά η προθεσμία. Χωρίς αυτό, μετρά από τη δημιουργία.
  filmingId?: string;
  createdAt: string;
  createdBy: string;
  versions: readonly Version[];
  finalFiles?: string;
  charge?: ChargeDecision;
  requests: readonly PostApprovalRequest[];
  trail: readonly { when: string; who: string; what: string }[];
}

// Κανόνες Παραδοτέων (Ρυθμίσεις › Παραδοτέα), με τις προεπιλογές του πρώτου στησίματος.
export interface DeliverableRules {
  internalReview: boolean;
  daysAfterChanges: number;
  deadlineDays: Readonly<Partial<Record<ProvisionKindId, number>>>;
  reminderDays: readonly number[];
}

export const DELIVERABLE_RULES: DeliverableRules = {
  internalReview: true,
  daysAfterChanges: 2,
  deadlineDays: { reel: 5, video: 10, photo: 3, episode: 5 },
  reminderDays: [3, 7],
};

const drive = (slug: string): string =>
  `https://drive.google.com/file/d/${slug}/view`;
const vimeo = (slug: string): string => `https://vimeo.com/${slug}`;

const approvedV1 = (
  id: string,
  by: string,
  sentAt: string,
  approvedAt: string,
): DeliverableDetail => ({
  id,
  createdAt: sentAt,
  createdBy: by,
  versions: [
    {
      number: 1,
      link: vimeo(`8${id.length}${sentAt.replaceAll("-", "")}`),
      host: "Vimeo",
      addedBy: by,
      addedAt: sentAt,
      state: "εγκρίθηκε",
      sentAt,
      answer: { by: "Μαρία Παπαδάκη", when: approvedAt },
      comments: [],
    },
  ],
  requests: [],
  trail: [],
});

export const DELIVERABLE_DETAILS: readonly DeliverableDetail[] = [
  approvedV1("d-kypseli-09-1", "aris", "2026-09-11", "2026-09-12"),
  {
    id: "d-kypseli-09-2",
    filmingId: "f-kypseli-0908",
    createdAt: "2026-09-08",
    createdBy: "aris",
    versions: [
      {
        number: 1,
        link: vimeo("912000101"),
        host: "Vimeo",
        addedBy: "aris",
        addedAt: "2026-09-10",
        state: "χρειάζεται αλλαγές",
        review: { by: "giorgos", when: "2026-09-10" },
        sentAt: "2026-09-10",
        answer: { by: "Νίκος Σταυρίδης", when: "2026-09-11" },
        comments: [
          {
            id: "c1",
            who: "Νίκος Σταυρίδης",
            isClient: true,
            when: "2026-09-11",
            at: 7,
            text: "Το λογότυπο φαίνεται πολύ μικρό εδώ.",
          },
          {
            id: "c2",
            who: "Νίκος Σταυρίδης",
            isClient: true,
            when: "2026-09-11",
            at: 21,
            text: "Θα θέλαμε πιο ζεστή μουσική στο κλείσιμο.",
          },
          {
            id: "c3",
            who: "aris",
            isClient: false,
            when: "2026-09-11",
            isInternal: true,
            text: "Η μουσική είναι από τη βιβλιοθήκη· έχουμε άδεια και για τη δεύτερη επιλογή.",
          },
        ],
      },
      {
        number: 2,
        link: vimeo("912000102"),
        host: "Vimeo",
        addedBy: "aris",
        addedAt: "2026-09-14",
        state: "εγκρίθηκε",
        review: { by: "giorgos", when: "2026-09-14" },
        sentAt: "2026-09-14",
        answer: { by: "Μαρία Παπαδάκη", when: "2026-09-15" },
        comments: [],
      },
    ],
    finalFiles: drive("kypseli-proinos-kafes-final"),
    requests: [
      {
        id: "rq-kypseli-2",
        by: "Μαρία Παπαδάκη",
        when: "2026-09-19",
        text: "Μπορείτε να αλλάξετε τον τίτλο σε «Καλημέρα από την Κυψέλη»;",
      },
    ],
    trail: [
      {
        when: "2026-09-08",
        who: "aris",
        what: "Δημιούργησε το Παραδοτέο (Παροχή reel)",
      },
      { when: "2026-09-15", who: "Μαρία Παπαδάκη", what: "Ενέκρινε την v2" },
      {
        when: "2026-09-19",
        who: "Μαρία Παπαδάκη",
        what: "Αίτημα αλλαγής μετά την έγκριση",
      },
    ],
  },
  {
    id: "d-kypseli-09-3",
    filmingId: "f-kypseli-0908",
    createdAt: "2026-09-08",
    createdBy: "aris",
    versions: [
      {
        number: 1,
        link: drive("kypseli-maria-mpara-v1"),
        host: "Google Drive",
        addedBy: "sofia",
        addedAt: "2026-09-12",
        state: "χρειάζεται αλλαγές",
        review: { by: "giorgos", when: "2026-09-12" },
        sentAt: "2026-09-12",
        answer: { by: "Μαρία Παπαδάκη", when: "2026-09-13" },
        comments: [
          {
            id: "c1",
            who: "Μαρία Παπαδάκη",
            isClient: true,
            when: "2026-09-13",
            at: 12,
            text: "Κόψτε το πλάνο με το ταμείο, φαίνονται τιμές.",
          },
        ],
      },
      {
        number: 2,
        link: drive("kypseli-maria-mpara-v2"),
        host: "Google Drive",
        addedBy: "sofia",
        addedAt: "2026-09-18",
        state: "αναμένει πελάτη",
        review: { by: "giorgos", when: "2026-09-18" },
        sentAt: "2026-09-18",
        comments: [
          {
            id: "c2",
            who: "sofia",
            isClient: false,
            when: "2026-09-18",
            isInternal: true,
            text: "Ο γύρος του ορίου έχει γίνει. Αν ζητήσουν κι άλλο, χρεώνεται.",
          },
        ],
      },
    ],
    requests: [],
    trail: [
      {
        when: "2026-09-08",
        who: "aris",
        what: "Δημιούργησε το Παραδοτέο (Παροχή reel), Ανατεθειμένη η Σοφία",
      },
      {
        when: "2026-09-13",
        who: "Μαρία Παπαδάκη",
        what: "Ζήτησε αλλαγές στην v1 (γύρος 1 από 1)",
      },
      {
        when: "2026-09-18",
        who: "giorgos",
        what: "Έστειλε την v2 στον πελάτη",
      },
    ],
  },
  {
    id: "d-kypseli-09-4",
    filmingId: "f-kypseli-0908",
    createdAt: "2026-09-08",
    createdBy: "aris",
    versions: [
      {
        number: 1,
        link: vimeo("912000401"),
        host: "Vimeo",
        addedBy: "aris",
        addedAt: "2026-09-19",
        state: "αναμένει εσωτερικό έλεγχο",
        comments: [],
      },
    ],
    requests: [],
    trail: [
      {
        when: "2026-09-19",
        who: "aris",
        what: "Πρόσθεσε την v1· αναμένει εσωτερικό έλεγχο",
      },
    ],
  },
  {
    id: "d-kypseli-09-5",
    filmingId: "f-kypseli-0908",
    createdAt: "2026-09-08",
    createdBy: "aris",
    versions: [
      {
        number: 1,
        link: vimeo("912000501"),
        host: "Vimeo",
        addedBy: "aris",
        addedAt: "2026-09-16",
        state: "επιστράφηκε από έλεγχο",
        review: {
          by: "giorgos",
          when: "2026-09-17",
          note: "Ο ήχος κόβεται στο 0:18. Και βάλε υπότιτλους, το βλέπουν χωρίς ήχο.",
        },
        comments: [],
      },
    ],
    requests: [],
    trail: [
      { when: "2026-09-16", who: "aris", what: "Πρόσθεσε την v1" },
      {
        when: "2026-09-17",
        who: "giorgos",
        what: "Επέστρεψε την v1 από τον έλεγχο",
      },
    ],
  },
  {
    id: "d-kypseli-09-6",
    createdAt: "2026-09-08",
    createdBy: "aris",
    versions: [],
    requests: [],
    trail: [
      {
        when: "2026-09-10",
        who: "dimitris",
        what: "Ακύρωσε το Παραδοτέο· η Παροχή επιστρέφει στην επόμενη Περίοδο",
      },
    ],
  },
  approvedV1("d-kinisi-09-1", "aris", "2026-09-08", "2026-09-09"),
  approvedV1("d-kinisi-09-2", "aris", "2026-09-08", "2026-09-10"),
  {
    id: "d-kinisi-09-3",
    filmingId: "f-kinisi-0903",
    createdAt: "2026-09-03",
    createdBy: "aris",
    versions: [
      {
        number: 1,
        link: vimeo("913000301"),
        host: "Vimeo",
        addedBy: "aris",
        addedAt: "2026-09-09",
        state: "χρειάζεται αλλαγές",
        review: { by: "dimitris", when: "2026-09-09" },
        sentAt: "2026-09-09",
        answer: { by: "Γυμναστήριο Κίνηση", when: "2026-09-10" },
        comments: [
          {
            id: "c1",
            who: "Γυμναστήριο Κίνηση",
            isClient: true,
            when: "2026-09-10",
            at: 4,
            text: "Λάθος όνομα προπονητή στον τίτλο.",
          },
        ],
      },
      {
        number: 2,
        link: vimeo("913000302"),
        host: "Vimeo",
        addedBy: "aris",
        addedAt: "2026-09-14",
        state: "αναμένει πελάτη",
        review: { by: "dimitris", when: "2026-09-14" },
        sentAt: "2026-09-14",
        comments: [
          {
            id: "c2",
            who: "Γυμναστήριο Κίνηση",
            isClient: true,
            when: "2026-09-15",
            isBrokenLink: true,
            text: "Το link δεν ανοίγει.",
          },
        ],
      },
    ],
    requests: [],
    trail: [
      {
        when: "2026-09-10",
        who: "Γυμναστήριο Κίνηση",
        what: "Ζήτησε αλλαγές στην v1 (γύρος 1 από 1)",
      },
      {
        when: "2026-09-14",
        who: "dimitris",
        what: "Έστειλε την v2 στον πελάτη",
      },
      {
        when: "2026-09-15",
        who: "Γυμναστήριο Κίνηση",
        what: "Ανέφερε ότι το link δεν ανοίγει",
      },
    ],
  },
  {
    id: "d-kinisi-09-4",
    filmingId: "f-kinisi-0921",
    createdAt: "2026-09-17",
    createdBy: "dimitris",
    versions: [],
    requests: [],
    trail: [
      {
        when: "2026-09-17",
        who: "dimitris",
        what: "Δημιούργησε το Παραδοτέο, Ανατεθειμένος ο Άρης",
      },
    ],
  },
  {
    id: "d-kinisi-09-5",
    filmingId: "f-kinisi-0903",
    createdAt: "2026-09-03",
    createdBy: "aris",
    versions: [
      {
        number: 1,
        link: vimeo("913000501"),
        host: "Vimeo",
        addedBy: "aris",
        addedAt: "2026-09-08",
        state: "χρειάζεται αλλαγές",
        review: { by: "dimitris", when: "2026-09-08" },
        sentAt: "2026-09-08",
        answer: { by: "Γυμναστήριο Κίνηση", when: "2026-09-09" },
        comments: [
          {
            id: "c1",
            who: "Γυμναστήριο Κίνηση",
            isClient: true,
            when: "2026-09-09",
            at: 15,
            text: "Να φαίνεται το τηλέφωνο στο τέλος.",
          },
        ],
      },
      {
        number: 2,
        link: vimeo("913000502"),
        host: "Vimeo",
        addedBy: "aris",
        addedAt: "2026-09-12",
        state: "χρειάζεται αλλαγές",
        review: { by: "dimitris", when: "2026-09-12" },
        sentAt: "2026-09-12",
        answer: { by: "Γυμναστήριο Κίνηση", when: "2026-09-18" },
        comments: [
          {
            id: "c2",
            who: "Γυμναστήριο Κίνηση",
            isClient: true,
            when: "2026-09-18",
            at: 2,
            text: "Τελικά θέλουμε άλλη μουσική, πιο δυναμική.",
          },
        ],
      },
    ],
    charge: { round: 2, askedAt: "2026-09-18" },
    requests: [],
    trail: [
      { when: "2026-09-09", who: "Γυμναστήριο Κίνηση", what: "Ζήτησε αλλαγές στην v1 (γύρος 1 από 1)" },
      {
        when: "2026-09-18",
        who: "Γυμναστήριο Κίνηση",
        what: "Ζήτησε αλλαγές στην v2 (γύρος 2 από 1, πέρα από το όριο· προειδοποιήθηκε ότι χρεώνεται)",
      },
    ],
  },
  approvedV1("d-athina-09-1", "sofia", "2026-09-12", "2026-09-13"),
  {
    id: "d-athina-09-2",
    filmingId: "f-athina-0910",
    createdAt: "2026-09-10",
    createdBy: "dimitris",
    versions: [
      {
        number: 1,
        link: drive("athina-barista-v1"),
        host: "Google Drive",
        addedBy: "sofia",
        addedAt: "2026-09-18",
        state: "αναμένει εσωτερικό έλεγχο",
        comments: [],
      },
    ],
    requests: [],
    trail: [
      {
        when: "2026-09-18",
        who: "sofia",
        what: "Πρόσθεσε την v1· αναμένει εσωτερικό έλεγχο",
      },
    ],
  },
  {
    id: "d-athina-09-3",
    createdAt: "2026-09-12",
    createdBy: "dimitris",
    versions: [],
    requests: [],
    trail: [],
  },
  {
    id: "d-armyra-4",
    createdAt: "2025-06-01",
    createdBy: "giorgos",
    versions: [
      {
        number: 1,
        link: vimeo("804000401"),
        host: "Vimeo",
        addedBy: "aris",
        addedAt: "2025-06-05",
        state: "αναμένει πελάτη",
        sentAt: "2025-06-05",
        comments: [],
      },
    ],
    requests: [],
    trail: [
      {
        when: "2025-06-05",
        who: "giorgos",
        what: "Έστειλε την v1 στον πελάτη",
      },
      {
        when: "2025-06-20",
        who: "giorgos",
        what: "Παρέδωσε χειροκίνητα την Παραγωγή: «εγκρίθηκε τηλεφωνικά»",
      },
    ],
  },
  {
    id: "d-showreel-1",
    createdAt: "2026-09-01",
    createdBy: "giorgos",
    versions: [
      {
        number: 1,
        link: vimeo("920000101"),
        host: "Vimeo",
        addedBy: "aris",
        addedAt: "2026-09-12",
        state: "επιστράφηκε από έλεγχο",
        review: {
          by: "giorgos",
          when: "2026-09-13",
          note: "Πιο γρήγορο μοντάζ στα πρώτα 10″.",
        },
        comments: [],
      },
      {
        number: 2,
        link: vimeo("920000102"),
        host: "Vimeo",
        addedBy: "aris",
        addedAt: "2026-09-19",
        state: "αναμένει εσωτερικό έλεγχο",
        comments: [],
      },
    ],
    requests: [],
    trail: [],
  },
  {
    id: "d-showreel-2",
    createdAt: "2026-09-01",
    createdBy: "giorgos",
    versions: [],
    requests: [],
    trail: [],
  },
];

export const findDeliverableDetail = (
  id: string,
): DeliverableDetail | undefined =>
  DELIVERABLE_DETAILS.find((detail) => detail.id === id);
