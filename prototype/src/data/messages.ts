// Φανταστικά δεδομένα του module «11 Μηνύματα»: μία Συνομιλία ανά Πελάτη, Μηνύματα με ετικέτα Παραγωγής,
// Εσωτερικά Μηνύματα με @αναφορά, Αιτήματα (Μήνυμα με κατάσταση) και αδιάβαστα ανά Χρήστη.
// Repo public: μόνο επινοημένα ονόματα και αρχεία. Πηγές: κεφ. 3.6, «Λεπτομέρειες κανόνων: Μηνύματα», ADR 0012.

export type RequestKind =
  "νέο Παραδοτέο" | "Γύρισμα" | "αλλαγή μετά την έγκριση" | "άλλο";

export const REQUEST_KINDS: readonly RequestKind[] = [
  "νέο Παραδοτέο",
  "Γύρισμα",
  "αλλαγή μετά την έγκριση",
  "άλλο",
];

export type RequestState = "ανοιχτό" | "ολοκληρώθηκε" | "απορρίφθηκε";

// Σύνδεσμος σε ό,τι δημιουργήθηκε από το Αίτημα: μια οθόνη του prototype με τις παραμέτρους της.
export interface CreatedLink {
  label: string;
  code: string;
  params: Readonly<Record<string, string>>;
}

export interface RequestClosing {
  by: string;
  when: string;
  link?: CreatedLink;
  comment?: string;
  // Υποχρεωτική όταν απορρίπτεται· τη βλέπει ο πελάτης.
  reply?: string;
  // Έκλεισε μόνο του, επειδή η ομάδα δημιούργησε από το Αίτημα αυτό που ζητήθηκε.
  isAutomatic?: boolean;
}

export interface MessageRequest {
  kind: RequestKind;
  state: RequestState;
  // null = «Χωρίς υπεύθυνο».
  assigneeId: string | null;
  declaredBy: "πελάτης" | "ομάδα";
  declaredAt: string;
  deliverableId?: string;
  closing?: RequestClosing;
}

export interface Attachment {
  name: string;
  kind: "εικόνα" | "PDF" | "έγγραφο";
  sizeKb: number;
}

export type Author =
  { kind: "team"; personId: string } | { kind: "client"; name: string };

export interface Message {
  id: string;
  clientId: string;
  at: string;
  author: Author;
  text: string;
  productionId?: string;
  isInternal?: boolean;
  mentions?: readonly string[];
  attachments?: readonly Attachment[];
  editedAt?: string;
  deletedAt?: string;
  request?: MessageRequest;
}

// Ρυθμίσεις των Μηνυμάτων με τις προεπιλογές του πρώτου στησίματος (Ρυθμίσεις › Μηνύματα και Αυτοματισμοί).
export const MESSAGE_RULES = {
  editMinutes: 15,
  maxFileMb: 10,
  maxFiles: 5,
  digestMinutes: 15,
  requestOpenDays: 3,
} as const;

const team = (personId: string): Author => ({ kind: "team", personId });
const client = (name: string): Author => ({ kind: "client", name });

const MARIA = client("Μαρία Παπαδάκη");
const NIKOS_S = client("Νίκος Σταυρίδης");
const STAVROS = client("Σταύρος Μπαλτάς");
const MARIA_S = client("Μαρία Σιμιτζή");
const KOSTAS = client("Κώστας Λάμπρου");

const KYPSELI_09 = "pr-kypseli-09";

const KYPSELI: readonly Message[] = [
  {
    id: "m-ky-01",
    clientId: "kypseli",
    at: "2026-08-20T11:02",
    author: MARIA,
    text: "Μπορείτε να μας στείλετε το logo σε υψηλή ανάλυση; Το χρειάζεται το τυπογραφείο.",
    request: {
      kind: "άλλο",
      state: "ολοκληρώθηκε",
      assigneeId: "anna",
      declaredBy: "πελάτης",
      declaredAt: "2026-08-20T11:02",
      closing: {
        by: "anna",
        when: "2026-08-20T15:40",
        comment: "Στάλθηκε το logo σε PNG και PDF, στο συνημμένο από κάτω.",
      },
    },
  },
  {
    id: "m-ky-02",
    clientId: "kypseli",
    at: "2026-08-20T15:40",
    author: team("anna"),
    text: "Ορίστε το logo σε δύο μορφές.",
    attachments: [
      { name: "kypseli-logo.png", kind: "εικόνα", sizeKb: 840 },
      { name: "kypseli-logo.pdf", kind: "PDF", sizeKb: 310 },
    ],
  },
  {
    id: "m-ky-03",
    clientId: "kypseli",
    at: "2026-09-01T09:10",
    author: team("anna"),
    text: "Καλό μήνα! Ξεκίνησε η Περίοδος Σεπτεμβρίου: 2 Γυρίσματα και 8 reels. Κλείστε το πρώτο Γύρισμα όποτε σας βολεύει.",
  },
  {
    id: "m-ky-04",
    clientId: "kypseli",
    at: "2026-09-02T10:05",
    author: MARIA,
    productionId: KYPSELI_09,
    text: "Για το Γύρισμα της 8/9 μπορούμε να ξεκινήσουμε στις 10:00 αντί για τις 9:00;",
  },
  {
    id: "m-ky-05",
    clientId: "kypseli",
    at: "2026-09-02T10:40",
    author: team("aris"),
    productionId: KYPSELI_09,
    text: "Κανένα πρόβλημα, το αλλάξαμε. Ερχόμαστε στις 10:00.",
  },
  {
    id: "m-ky-06",
    clientId: "kypseli",
    at: "2026-09-02T10:42",
    author: team("aris"),
    productionId: KYPSELI_09,
    isInternal: true,
    mentions: ["sofia"],
    text: "@Σοφία Λαζαρίδου το φως πρέπει να είναι στημένο ως τις 10:15. Φόρτωσε το van από το βράδυ.",
  },
  {
    id: "m-ky-07",
    clientId: "kypseli",
    at: "2026-09-05T13:20",
    author: MARIA,
    productionId: KYPSELI_09,
    text: "Θέλουμε ένα reel για το φθινοπωρινό μενού, να βγει πριν τις 15/9.",
    request: {
      kind: "νέο Παραδοτέο",
      state: "ολοκληρώθηκε",
      assigneeId: "aris",
      declaredBy: "πελάτης",
      declaredAt: "2026-09-05T13:20",
      closing: {
        by: "aris",
        when: "2026-09-08T09:30",
        isAutomatic: true,
        link: {
          label: "Reel: φθινοπωρινό μενού",
          code: "H2",
          params: { deliverable: "d-kypseli-09-1" },
        },
      },
    },
  },
  {
    id: "m-ky-08",
    clientId: "kypseli",
    at: "2026-09-09T17:45",
    author: MARIA,
    productionId: KYPSELI_09,
    text: "Και ένα επιπλέον reel για το brunch της Κυριακής;",
    request: {
      kind: "νέο Παραδοτέο",
      state: "απορρίφθηκε",
      assigneeId: "aris",
      declaredBy: "πελάτης",
      declaredAt: "2026-09-09T17:45",
      closing: {
        by: "aris",
        when: "2026-09-10T10:05",
        reply:
          "Τα 8 reels του Σεπτεμβρίου έχουν ήδη προγραμματιστεί. Το βάζουμε πρώτο στον Οκτώβριο, ή το κάνουμε τώρα ως έξτρα με χρέωση. Πείτε μας τι προτιμάτε.",
      },
    },
  },
  {
    id: "m-ky-09",
    clientId: "kypseli",
    at: "2026-09-12T12:15",
    author: NIKOS_S,
    productionId: KYPSELI_09,
    text: "Σας στέλνω το νέο μενού για το reel του γλυκού της εβδομάδας.",
    attachments: [{ name: "menou-fthinoporo.pdf", kind: "PDF", sizeKb: 420 }],
  },
  {
    id: "m-ky-10",
    clientId: "kypseli",
    at: "2026-09-17T09:30",
    author: MARIA,
    text: "Πριν την ανανέωση θα θέλαμε να συζητήσουμε την τιμή του πακέτου από τον Ιανουάριο.",
  },
  {
    id: "m-ky-11",
    clientId: "kypseli",
    at: "2026-09-17T10:02",
    author: team("anna"),
    isInternal: true,
    mentions: ["giorgos"],
    text: "@Γιώργος Μαυρίδης θέλουν να μιλήσουμε για την τιμή. Προτείνω να μείνουμε στα 900 € και να προσθέσουμε ένα reel.",
  },
  {
    id: "m-ky-12",
    clientId: "kypseli",
    at: "2026-09-17T10:10",
    author: team("anna"),
    editedAt: "2026-09-17T10:14",
    text: "Φυσικά! Θα σας στείλω πρόταση για την ανανέωση μέσα στον Νοέμβριο και τα λέμε από κοντά.",
  },
  {
    id: "m-ky-13",
    clientId: "kypseli",
    at: "2026-09-18T18:20",
    author: MARIA,
    text: "Θέλουμε ένα reel για τη βραδιά jazz της Παρασκευής 25/9.",
    request: {
      kind: "νέο Παραδοτέο",
      state: "ανοιχτό",
      assigneeId: "anna",
      declaredBy: "πελάτης",
      declaredAt: "2026-09-18T18:20",
    },
  },
  {
    id: "rq-kypseli-2",
    clientId: "kypseli",
    at: "2026-09-19T10:30",
    author: MARIA,
    productionId: KYPSELI_09,
    text: "Μπορείτε να αλλάξετε τον τίτλο σε «Καλημέρα από την Κυψέλη»;",
    request: {
      kind: "αλλαγή μετά την έγκριση",
      state: "ανοιχτό",
      assigneeId: "aris",
      declaredBy: "πελάτης",
      declaredAt: "2026-09-19T10:30",
      deliverableId: "d-kypseli-09-2",
    },
  },
  {
    id: "m-ky-15",
    clientId: "kypseli",
    at: "2026-09-19T14:00",
    author: team("aris"),
    productionId: KYPSELI_09,
    text: "",
    deletedAt: "2026-09-19T14:03",
  },
  {
    id: "m-ky-16",
    clientId: "kypseli",
    at: "2026-09-20T09:15",
    author: MARIA,
    text: "Μπορούμε να κάνουμε και τρίτο Γύρισμα τον Σεπτέμβριο; Το σύστημα δεν μας αφήνει να το κλείσουμε.",
    request: {
      kind: "Γύρισμα",
      state: "ανοιχτό",
      assigneeId: "anna",
      declaredBy: "πελάτης",
      declaredAt: "2026-09-20T09:15",
    },
  },
  {
    id: "m-ky-17",
    clientId: "kypseli",
    at: "2026-09-20T11:50",
    author: team("sofia"),
    productionId: KYPSELI_09,
    text: "Η δεύτερη Έκδοση του «Η Μαρία στη μπάρα» σας περιμένει για έγκριση.",
  },
];

const OTHERS: readonly Message[] = [
  {
    id: "m-ki-01",
    clientId: "kinisi",
    at: "2026-09-14T08:40",
    author: STAVROS,
    productionId: "pr-kinisi-09",
    text: "Πώς σας φάνηκε το υλικό από το δεύτερο Γύρισμα;",
  },
  {
    id: "m-ki-02",
    clientId: "kinisi",
    at: "2026-09-14T09:05",
    author: team("aris"),
    productionId: "pr-kinisi-09",
    isInternal: true,
    mentions: ["sofia"],
    text: "@Σοφία Λαζαρίδου το υλικό από το δεύτερο Γύρισμα έχει θόρυβο στον ήχο. Μπορείς να το δεις πριν απαντήσουμε;",
  },
  {
    id: "m-ki-03",
    clientId: "kinisi",
    at: "2026-09-14T09:12",
    author: team("aris"),
    productionId: "pr-kinisi-09",
    text: "Το κοιτάμε και σας λέμε μέσα στη μέρα!",
  },
  {
    id: "m-ki-04",
    clientId: "kinisi",
    at: "2026-09-16T19:30",
    author: STAVROS,
    text: "Μπορείτε να ανεβάζετε τα reels και στο TikTok μας;",
    request: {
      kind: "άλλο",
      state: "ανοιχτό",
      assigneeId: "anna",
      declaredBy: "ομάδα",
      declaredAt: "2026-09-17T08:50",
    },
  },
  {
    id: "m-at-01",
    clientId: "athina",
    at: "2026-09-10T16:00",
    author: MARIA_S,
    text: "Θέλουμε ένα reel για το event της Παρασκευής.",
    request: {
      kind: "νέο Παραδοτέο",
      state: "ολοκληρώθηκε",
      assigneeId: "nikos",
      declaredBy: "πελάτης",
      declaredAt: "2026-09-10T16:00",
      closing: {
        by: "nikos",
        when: "2026-09-11T10:20",
        isAutomatic: true,
        link: {
          label: "Το Παραδοτέο του event",
          code: "H2",
          params: { deliverable: "d-athina-09-3" },
        },
      },
    },
  },
  {
    id: "m-at-02",
    clientId: "athina",
    at: "2026-09-18T12:00",
    author: team("sofia"),
    productionId: "pr-athina-09",
    text: "Στείλαμε το reel του event. Περιμένουμε τα σχόλιά σας.",
  },
  {
    id: "m-ar-01",
    clientId: "armyra",
    at: "2025-12-02T13:00",
    author: KOSTAS,
    productionId: "pr-armyra-2025",
    text: "Ευχαριστούμε πολύ για το βίντεο, το ανεβάσαμε σήμερα!",
  },
];

export const MESSAGES: readonly Message[] = [...KYPSELI, ...OTHERS];

// Αδιάβαστα ανά Χρήστη (id ομάδας, ή «client» για τον «Πλήρη» του prototype). Κανείς δεν βλέπει τα αδιάβαστα άλλου.
export const UNREAD: Readonly<Record<string, readonly string[]>> = {
  giorgos: ["m-ky-11", "m-ky-16"],
  dimitris: ["m-ky-16", "m-ki-04"],
  aris: ["rq-kypseli-2", "m-ki-01"],
  anna: ["m-ky-16", "m-ki-04"],
  client: ["m-ky-17"],
};

export const findMessage = (id: string): Message | undefined =>
  MESSAGES.find((message) => message.id === id);
