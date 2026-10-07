// Φανταστικά δεδομένα του module «13 Γνώση και Βοηθός»: Ενότητες, στοιχεία Γνώσης (Άρθρα και Αρχεία),
// Συζητήσεις Βοηθού, Αναπάντητες ερωτήσεις και τα όρια του Βοηθού. Repo public: μόνο επινοημένα στοιχεία.
// Πηγές: κεφ. 3.8 (και «Λεπτομέρειες κανόνων»), ADR 0014, ADR 0016, κεφ. 4 (Γεγονός 57).

import type { RoleId } from "@/data/roles";

// Το Κοινό: Ρόλοι (ομάδας ή πελάτη) ή «δημόσιο». Ο Επισκέπτης δεν είναι Ρόλος· βλέπει μόνο το «δημόσιο».
export type AudienceRole = Exclude<RoleId, "visitor">;
export type Audience =
  { kind: "δημόσιο" } | { kind: "ρόλοι"; roles: readonly AudienceRole[] };

export interface KbSection {
  id: string;
  title: string;
  // Η μία πρόταση για το τι περιέχει· μαζί με τις Περιλήψεις κάνει τον «χάρτη».
  blurb: string;
}

export const KB_SECTIONS: readonly KbSection[] = [
  {
    id: "client-guides",
    title: "Οδηγοί πελάτη",
    blurb: "Ό,τι χρειάζεται ένας πελάτης για να δουλεύει με το σύστημα.",
  },
  {
    id: "how-we-work",
    title: "Πώς δουλεύουμε",
    blurb:
      "Η διαδρομή μιας συνεργασίας, από το πρώτο τηλέφωνο ως την παράδοση.",
  },
  {
    id: "filming",
    title: "Γυρίσματα στην πράξη",
    blurb: "Προετοιμασία, εξοπλισμός και κανόνες στο σετ για την ομάδα.",
  },
  {
    id: "sales",
    title: "Υλικό πωλήσεων",
    blurb: "Παρουσιάσεις, απαντήσεις σε αντιρρήσεις και δείγματα δουλειάς.",
  },
  {
    id: "templates",
    title: "Πρότυπα",
    blurb: "Έτοιμα αρχεία για να μη γράφουμε το ίδιο δύο φορές.",
  },
];

export type KbItemState = "πρόχειρο" | "δημοσιευμένο";

// Τι διαβάζει ο Βοηθός από ένα Αρχείο: όλο το κείμενο, ή μόνο τίτλο και Περίληψη όταν το αρχείο είναι εικόνα.
export type FileReadability = "κείμενο" | "μόνο Περίληψη";

interface KbItemBase {
  id: string;
  sectionId: string;
  title: string;
  summary: string;
  audience: Audience | null;
  state: KbItemState;
  updated: { when: string; by: string };
  // Πόσες φορές το χρησιμοποίησε ο Βοηθός ως πηγή τις τελευταίες 30 μέρες.
  citedLast30: number;
}

export interface KbArticle extends KbItemBase {
  kind: "Άρθρο";
  body: readonly string[];
}

export interface KbFile extends KbItemBase {
  kind: "Αρχείο";
  fileName: string;
  sizeMb: number;
  readability: FileReadability;
}

export type KbItem = KbArticle | KbFile;

const team = (...roles: AudienceRole[]): Audience => ({ kind: "ρόλοι", roles });
const ALL_TEAM: Audience = team(
  "owner",
  "admin",
  "production",
  "sales",
  "accountant",
);

export const KB_ITEMS: readonly KbItem[] = [
  {
    id: "kb-book-filming",
    kind: "Άρθρο",
    sectionId: "client-guides",
    title: "Πώς κλείνω Γύρισμα",
    summary:
      "Τα βήματα για να ζητήσετε Γύρισμα από τον λογαριασμό σας, και τι γίνεται μέχρι να εγκριθεί.",
    audience: team("client"),
    state: "δημοσιευμένο",
    updated: { when: "2026-09-14", by: "Δημήτρης Ιωάννου" },
    citedLast30: 14,
    body: [
      "Από το «Σήμερα» πατήστε «Κλείσε Γύρισμα» και διαλέξτε ελεύθερη μέρα από το ημερολόγιο.",
      "Η μέρα κρατιέται για εσάς αμέσως. Η ομάδα εγκρίνει μέσα σε μία εργάσιμη και παίρνετε email.",
      "Αν η Περίοδος δεν έχει άλλη Παροχή Γυρίσματος, το σύστημα σας το λέει πριν στείλετε. Για τιμές, δείτε τον Κατάλογο.",
    ],
  },
  {
    id: "kb-approve",
    kind: "Άρθρο",
    sectionId: "client-guides",
    title: "Πώς εγκρίνω ένα Παραδοτέο",
    summary:
      "Πού βρίσκω το link, πώς ζητώ αλλαγές και τι σημαίνει ότι η έγκριση είναι τελική.",
    audience: team("client"),
    state: "δημοσιευμένο",
    updated: { when: "2026-09-20", by: "Δημήτρης Ιωάννου" },
    citedLast30: 9,
    body: [
      "Κάθε Παραδοτέο έρχεται ως link. Ανοίξτε το, δείτε το και πατήστε «Εγκρίνω» ή «Θέλω αλλαγές».",
      "Οι αλλαγές γράφονται σε ένα σχόλιο. Κάθε Παραδοτέο έχει συγκεκριμένους γύρους αλλαγών στη Συμφωνία σας.",
      "Η έγκριση είναι τελική: μετά από αυτήν, νέα αλλαγή είναι νέο Αίτημα.",
    ],
  },
  {
    id: "kb-balance",
    kind: "Άρθρο",
    sectionId: "client-guides",
    title: "Πού βλέπω τα Τιμολόγιά μου",
    summary:
      "Η σελίδα Οικονομικά του λογαριασμού σας δείχνει Τιμολόγια, πληρωμές και ό,τι είναι ανοιχτό.",
    audience: team("client"),
    state: "πρόχειρο",
    updated: { when: "2026-09-19", by: "Γιώργος Μαυρίδης" },
    citedLast30: 0,
    body: [
      "Από το μενού, «Οικονομικά». Εκεί είναι κάθε Τιμολόγιο ως PDF και η κατάστασή του.",
    ],
  },
  {
    id: "kb-process",
    kind: "Άρθρο",
    sectionId: "how-we-work",
    title: "Από το πρώτο τηλέφωνο ως την παράδοση",
    summary:
      "Τα πέντε βήματα μιας συνεργασίας με τη Delta Films, για όποιον μας γνωρίζει τώρα.",
    audience: { kind: "δημόσιο" },
    state: "δημοσιευμένο",
    updated: { when: "2026-08-30", by: "Γιώργος Μαυρίδης" },
    citedLast30: 31,
    body: [
      "1. Μιλάμε για τον στόχο σας. 2. Σας στέλνουμε πρόταση. 3. Υπογράφετε online. 4. Γυρίζουμε. 5. Παραδίδουμε και εγκρίνετε.",
      "Για τιμές, δείτε τα Πακέτα μας.",
    ],
  },
  {
    id: "kb-hours",
    kind: "Άρθρο",
    sectionId: "how-we-work",
    title: "Ωράριο και Γυρίσματα το Σαββατοκύριακο",
    summary:
      "Δουλεύουμε Δευτέρα με Παρασκευή· Γυρίσματα Σάββατο ή Κυριακή γίνονται κατόπιν συνεννόησης.",
    audience: { kind: "δημόσιο" },
    state: "δημοσιευμένο",
    updated: { when: "2026-09-16", by: "Δημήτρης Ιωάννου" },
    citedLast30: 3,
    body: [
      "Το γραφείο απαντά Δευτέρα με Παρασκευή, 09:00–17:00. Γύρισμα σε Σαββατοκύριακο κλείνεται κατόπιν συνεννόησης.",
    ],
  },
  {
    id: "kb-set-rules",
    kind: "Άρθρο",
    sectionId: "filming",
    title: "Κανόνες στο σετ",
    summary:
      "Ώρα άφιξης, ποιος μιλά με τον πελάτη, τι κάνουμε αν κάτι χαλάσει.",
    audience: team("owner", "admin", "production"),
    state: "δημοσιευμένο",
    updated: { when: "2026-09-02", by: "Γιώργος Μαυρίδης" },
    citedLast30: 6,
    body: [
      "Φτάνουμε 30 λεπτά πριν. Με τον πελάτη μιλά ο Υπεύθυνος του Γυρίσματος.",
      "Αν χαλάσει εξοπλισμός, σημειώνεται στο Δελτίο και το Αντικείμενο μπαίνει «σε επισκευή».",
    ],
  },
  {
    id: "kb-checklist",
    kind: "Αρχείο",
    sectionId: "filming",
    title: "Checklist εξοπλισμού (εκτυπώσιμο)",
    summary: "Μία σελίδα για να τσεκάρουμε τι φορτώθηκε πριν φύγουμε.",
    audience: team("owner", "admin", "production"),
    state: "δημοσιευμένο",
    updated: { when: "2026-07-18", by: "Άρης Κωνσταντίνου" },
    citedLast30: 2,
    fileName: "checklist-exoplismou.pdf",
    sizeMb: 0.4,
    readability: "κείμενο",
  },
  {
    id: "kb-pitch",
    kind: "Αρχείο",
    sectionId: "sales",
    title: "Παρουσίαση εταιρείας 2026",
    summary:
      "Οι 14 διαφάνειες που δείχνουμε στην πρώτη συνάντηση, χωρίς τιμές.",
    audience: team("owner", "admin", "sales"),
    state: "δημοσιευμένο",
    updated: { when: "2026-09-10", by: "Άννα Δημητρίου" },
    citedLast30: 4,
    fileName: "parousiasi-2026.pdf",
    sizeMb: 8.2,
    readability: "κείμενο",
  },
  {
    id: "kb-objections",
    kind: "Άρθρο",
    sectionId: "sales",
    title: "«Είναι ακριβό»: πώς απαντάμε",
    summary:
      "Τρεις απαντήσεις στην πιο συχνή αντίρρηση, με παραδείγματα από πραγματικά αποτελέσματα.",
    audience: team("owner", "admin", "sales"),
    state: "δημοσιευμένο",
    updated: { when: "2026-09-10", by: "Άννα Δημητρίου" },
    citedLast30: 7,
    body: [
      "Δεν συζητάμε έκπτωση πριν δείξουμε το αποτέλεσμα. Οι τιμές είναι μόνο στον Κατάλογο.",
    ],
  },
  {
    id: "kb-moodboard",
    kind: "Αρχείο",
    sectionId: "templates",
    title: "Moodboard πρότυπο (σαρωμένο)",
    summary: "Πρότυπο σελίδας για moodboard πριν από εταιρικό βίντεο.",
    audience: ALL_TEAM,
    state: "δημοσιευμένο",
    updated: { when: "2026-06-11", by: "Σοφία Λαζαρίδου" },
    citedLast30: 0,
    fileName: "moodboard-scan.pdf",
    sizeMb: 3.1,
    readability: "μόνο Περίληψη",
  },
  {
    id: "kb-brief",
    kind: "Άρθρο",
    sectionId: "templates",
    title: "Brief εταιρικού βίντεο",
    summary: "",
    audience: null,
    state: "πρόχειρο",
    updated: { when: "2026-09-20", by: "Γιώργος Μαυρίδης" },
    citedLast30: 0,
    body: ["(Πρόχειρο χωρίς Περίληψη και Κοινό: δεν δημοσιεύεται ακόμα.)"],
  },
];

// Μία πηγή απάντησης: στοιχείο Γνώσης ή δημόσιο Πακέτο του Καταλόγου.
export type Source =
  | { kind: "γνώση"; itemId: string }
  | { kind: "πακέτο"; packageId: string }
  | { kind: "διαγραμμένο"; title: string };

export interface Turn {
  question: string;
  // Χωρίς πηγές = «δεν ξέρω», και η ερώτηση μπήκε στις Αναπάντητες.
  answer: string;
  sources: readonly Source[];
  // Πού παρέπεμψε ο Βοηθός όταν δεν ήξερε.
  referral?: "φόρμα" | "Συνομιλία" | "Διαχείριση Γνώσης";
}

export type ConversationKind = "δημόσια" | "πελάτη" | "ομάδας";

export interface Conversation {
  id: string;
  kind: ConversationKind;
  // Χρήστης για πελάτη/ομάδα· ο Επισκέπτης είναι ανώνυμος.
  who: string;
  language: "el" | "en";
  startedAt: string;
  lastAt: string;
  // Δημόσια μόνο: η σελίδα όπου άνοιξε το widget και αν έφτασε το όριο.
  page?: string;
  hitLimit?: boolean;
  turns: readonly Turn[];
}

export const CONVERSATIONS: readonly Conversation[] = [
  {
    id: "cv-1",
    kind: "πελάτη",
    who: "Μαρία Παπαδάκη (Κυψέλη Καφέ)",
    language: "el",
    startedAt: "2026-09-19T16:02",
    lastAt: "2026-09-19T16:05",
    turns: [
      {
        question: "πώς ζητάω Γύρισμα;",
        answer:
          "Από το «Σήμερα» πατάτε «Κλείσε Γύρισμα» και διαλέγετε ελεύθερη μέρα. Η μέρα κρατιέται αμέσως και η ομάδα εγκρίνει μέσα σε μία εργάσιμη.",
        sources: [{ kind: "γνώση", itemId: "kb-book-filming" }],
      },
      {
        question: "πόσο χρωστάμε αυτή τη στιγμή;",
        answer:
          "Δεν έχω πρόσβαση στα στοιχεία του λογαριασμού σας, οπότε δεν ξέρω. Γράψτε στη Συνομιλία με την ομάδα και θα σας απαντήσουν.",
        sources: [],
        referral: "Συνομιλία",
      },
    ],
  },
  {
    id: "cv-2",
    kind: "δημόσια",
    who: "Επισκέπτης",
    language: "en",
    startedAt: "2026-09-18T21:40",
    lastAt: "2026-09-18T21:43",
    page: "/en/packages",
    turns: [
      {
        question: "how much is a monthly social package?",
        answer:
          "Our «Monthly Presence» package starts from the price shown on its page, plus VAT. It includes 2 shoots and 8 reels per month.",
        sources: [{ kind: "πακέτο", packageId: "pkg-social" }],
      },
      {
        question: "do you film on Sundays?",
        answer:
          "We work Monday to Friday; weekend shoots are arranged on request.",
        sources: [{ kind: "γνώση", itemId: "kb-hours" }],
      },
    ],
  },
  {
    id: "cv-3",
    kind: "δημόσια",
    who: "Επισκέπτης",
    language: "el",
    startedAt: "2026-09-17T11:12",
    lastAt: "2026-09-17T11:20",
    page: "/el",
    hitLimit: true,
    turns: [
      {
        question: "πόσο κοστίζει ένα podcast;",
        answer:
          "Το «Podcast μηνιαίο» δεν δείχνει δημόσια τιμή, οπότε δεν έχω τιμή να σας πω. Συμπληρώστε τη φόρμα και θα σας στείλουμε πρόταση.",
        sources: [{ kind: "πακέτο", packageId: "pkg-podcast" }],
        referral: "φόρμα",
      },
      {
        question: "κάνετε και γάμους;",
        answer:
          "Δεν βρίσκω κάτι γι' αυτό, οπότε δεν ξέρω. Αφήστε μας τα στοιχεία σας στη φόρμα και θα σας απαντήσει άνθρωπος.",
        sources: [],
        referral: "φόρμα",
      },
    ],
  },
  {
    id: "cv-4",
    kind: "ομάδας",
    who: "Άρης Κωνσταντίνου",
    language: "el",
    startedAt: "2026-09-16T08:31",
    lastAt: "2026-09-16T08:33",
    turns: [
      {
        question: "τι ώρα πρέπει να είμαστε στο σετ;",
        answer: "30 λεπτά πριν από την ώρα έναρξης του Γυρίσματος.",
        sources: [{ kind: "γνώση", itemId: "kb-set-rules" }],
      },
      {
        question: "ποιος κωδικός ανοίγει την αποθήκη;",
        answer:
          "Δεν το βρίσκω στη Γνώση, οπότε δεν ξέρω. Η ερώτηση πήγε σε όσους διαχειρίζονται τη Γνώση.",
        sources: [],
        referral: "Διαχείριση Γνώσης",
      },
    ],
  },
  {
    id: "cv-5",
    kind: "ομάδας",
    who: "Άννα Δημητρίου",
    language: "el",
    startedAt: "2026-09-13T13:05",
    lastAt: "2026-09-13T13:06",
    turns: [
      {
        question: "τι λέμε όταν μας λένε ότι είναι ακριβό;",
        answer:
          "Δεν συζητάμε έκπτωση πριν δείξουμε το αποτέλεσμα, και οι τιμές είναι μόνο στον Κατάλογο.",
        sources: [
          { kind: "γνώση", itemId: "kb-objections" },
          { kind: "διαγραμμένο", title: "Παλιό σενάριο τηλεφώνου" },
        ],
      },
    ],
  },
];

export type UnansweredState = "ανοιχτή" | "καλύφθηκε" | "αγνοήθηκε";

// Ίδιες ερωτήσεις μαζεύονται σε μία γραμμή με μετρητή· κάθε ερώτηση κρατά τη Συζήτησή της.
export interface Unanswered {
  id: string;
  question: string;
  kind: ConversationKind;
  timesAsked: number;
  firstAt: string;
  lastAt: string;
  conversationIds: readonly string[];
  state: UnansweredState;
  coveredBy?: string;
  ignoredReason?: "εκτός θέματος" | "προσωπικά δεδομένα" | "κατάχρηση";
}

export const UNANSWERED: readonly Unanswered[] = [
  {
    id: "un-1",
    question: "κάνετε και γάμους;",
    kind: "δημόσια",
    timesAsked: 4,
    firstAt: "2026-09-02",
    lastAt: "2026-09-17",
    conversationIds: ["cv-3"],
    state: "ανοιχτή",
  },
  {
    id: "un-2",
    question: "ποιος κωδικός ανοίγει την αποθήκη;",
    kind: "ομάδας",
    timesAsked: 1,
    firstAt: "2026-09-16",
    lastAt: "2026-09-16",
    conversationIds: ["cv-4"],
    state: "ανοιχτή",
  },
  {
    id: "un-3",
    question: "πόσο χρωστάμε αυτή τη στιγμή;",
    kind: "πελάτη",
    timesAsked: 3,
    firstAt: "2026-09-05",
    lastAt: "2026-09-19",
    conversationIds: ["cv-1"],
    state: "ανοιχτή",
  },
  {
    id: "un-4",
    question: "δουλεύετε Κυριακές;",
    kind: "δημόσια",
    timesAsked: 2,
    firstAt: "2026-09-14",
    lastAt: "2026-09-15",
    conversationIds: [],
    state: "καλύφθηκε",
    coveredBy: "kb-hours",
  },
  {
    id: "un-5",
    question: "γράψε μου ένα ποίημα για καφέ",
    kind: "δημόσια",
    timesAsked: 1,
    firstAt: "2026-09-11",
    lastAt: "2026-09-11",
    conversationIds: [],
    state: "αγνοήθηκε",
    ignoredReason: "εκτός θέματος",
  },
];

// Τα όρια του Βοηθού. Τα ρυθμιζόμενα ζουν στις Ρυθμίσεις (ενότητα «Εταιρεία», «Βοηθός»)· τα σταθερά τα αλλάζει ο developer.
export interface AssistantLimits {
  messagesPerConversation: number;
  messagesPerAddressPerDay: number;
  monthlyCapUsd: number;
  // Το ποσοστό του πλαφόν που μπορεί να ξοδέψει το δημόσιο widget· το υπόλοιπο μένει για τους Χρήστες.
  publicSharePercent: number;
  fixed: {
    requestsPerMinute: number;
    questionChars: number;
    answerWords: number;
    fileMb: number;
  };
}

export const ASSISTANT_LIMITS: AssistantLimits = {
  messagesPerConversation: 15,
  messagesPerAddressPerDay: 40,
  monthlyCapUsd: 30,
  publicSharePercent: 80,
  fixed: {
    requestsPerMinute: 20,
    questionChars: 1000,
    answerWords: 200,
    fileMb: 25,
  },
};

// Η κατανάλωση του τρέχοντος μήνα (φανταστικό νούμερο), για την ένδειξη στη L2.
export const MONTH_USAGE = {
  month: "Σεπτέμβριος 2026",
  spentUsd: 11.4,
  publicUsd: 7.9,
};
