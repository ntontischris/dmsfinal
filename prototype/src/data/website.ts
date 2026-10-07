// Περιεχόμενο της Ιστοσελίδας που ζει στο DMS (κεφ. 9, ADR 0013): Τομείς, Δουλειές, Λογότυπα πελατών, Ομάδα.
// Repo public: μόνο επινοημένα ονόματα, κείμενα και διευθύνσεις.

export type Lang = "el" | "en";

// Συναίνεση δημοσίευσης: δήλωση ότι ο πελάτης (ή ο άνθρωπος της Ομάδας) συμφώνησε να φαίνεται δημόσια.
// Καταγράφεται με ημερομηνία, ποιος την πέρασε, πώς δόθηκε (υποχρεωτικό) και προαιρετικό συνημμένο.
export interface ConsentRecord {
  action: "δόθηκε" | "ανακλήθηκε";
  date: string;
  by: string;
  how: string;
  attachment?: string;
}

export interface Consent {
  isGiven: boolean;
  history: readonly ConsentRecord[];
}

interface EntryBase {
  id: string;
  isShown: boolean; // «Φαίνεται στην Ιστοσελίδα»: η ομάδα το ανάβει όταν η καταχώριση είναι έτοιμη
  order: number;
  updated: { when: string; by: string };
}

export interface Sector extends EntryBase {
  slug: string;
  nameEl: string;
  nameEn?: string;
  introEl: string;
  introEn?: string;
  packageIds: readonly string[]; // σύνδεση με Πακέτα του Καταλόγου
  serviceIds: readonly string[];
}

export interface CaseStory {
  challenge: string;
  solution: string;
  result: string;
}

export interface Work extends EntryBase {
  slug: string;
  titleEl: string;
  titleEn?: string;
  summaryEl: string;
  summaryEn?: string;
  video: { host: "Vimeo" | "YouTube"; url: string };
  cover: string;
  sectorIds: readonly string[];
  clientId?: string; // μόνο για εσωτερική αναφορά· δεν δημοσιεύει τίποτα από τον Πελάτη
  isOwnProduction: boolean; // δική μας παραγωγή χωρίς πελάτη: δεν θέλει Συναίνεση
  isFeatured: boolean; // «Επιλεγμένη» στην αρχική
  consent: Consent;
  storyEl?: CaseStory; // με ιστορία γίνεται case study
  storyEn?: CaseStory;
}

export interface ClientLogo extends EntryBase {
  clientName: string;
  clientId?: string;
  image: string;
  consent: Consent;
}

export interface TeamCard extends EntryBase {
  userId?: string; // προαιρετική σύνδεση με Χρήστη ομάδας, μόνο για προσυμπλήρωση
  name: string;
  nameEn?: string;
  titleEl: string;
  titleEn?: string;
  photo: string;
  consent: Consent; // η Συναίνεση του ίδιου του ανθρώπου
}

const given = (date: string, by: string, how: string, attachment?: string) => ({
  isGiven: true,
  history: [{ action: "δόθηκε" as const, date, by, how, attachment }],
});

const NONE: Consent = { isGiven: false, history: [] };

export const SECTORS: readonly Sector[] = [
  {
    id: "sec-social",
    slug: "social-media",
    nameEl: "Social media",
    nameEn: "Social media",
    introEl:
      "Reels και βίντεο κάθε μήνα, γυρισμένα στον χώρο σας και έτοιμα για ανάρτηση.",
    introEn:
      "Reels and videos every month, shot at your place and ready to post.",
    packageIds: ["pkg-social"],
    serviceIds: ["svc-extra-reel"],
    isShown: true,
    order: 1,
    updated: { when: "2026-09-02", by: "Δημήτρης Ιωάννου" },
  },
  {
    id: "sec-podcast",
    slug: "podcast",
    nameEl: "Podcast",
    nameEn: "Podcast",
    introEl:
      "Το podcast σας από την ιδέα ως το επεισόδιο, με ήχο και βίντεο στο στούντιο.",
    introEn:
      "Your podcast from idea to episode, with audio and video in the studio.",
    packageIds: ["pkg-podcast"],
    serviceIds: [],
    isShown: true,
    order: 2,
    updated: { when: "2026-09-02", by: "Δημήτρης Ιωάννου" },
  },
  {
    id: "sec-corporate",
    slug: "corporate",
    nameEl: "Εταιρικά βίντεο",
    introEl:
      "Βίντεο παρουσίασης, συνεντεύξεις και βίντεο για προσλήψεις, για εταιρείες κάθε μεγέθους.",
    packageIds: ["pkg-corporate"],
    serviceIds: [],
    isShown: true,
    order: 3,
    updated: { when: "2026-09-05", by: "Γιώργος Μαυρίδης" },
  },
  {
    id: "sec-events",
    slug: "events",
    nameEl: "Εκδηλώσεις",
    nameEn: "Events",
    introEl: "Ένα αναμνηστικό βίντεο από τη βραδιά σας, την επόμενη εβδομάδα.",
    introEn: "A highlight video of your night, the following week.",
    packageIds: ["pkg-event-mini"],
    serviceIds: [],
    isShown: true,
    order: 4,
    updated: { when: "2026-09-10", by: "Δημήτρης Ιωάννου" },
  },
  {
    id: "sec-music",
    slug: "music-videos",
    nameEl: "Μουσικά βίντεο",
    introEl: "Σε προετοιμασία.",
    packageIds: [],
    serviceIds: [],
    isShown: false,
    order: 5,
    updated: { when: "2026-09-18", by: "Γιώργος Μαυρίδης" },
  },
];

export const WORKS: readonly Work[] = [
  {
    id: "work-kinisi",
    slug: "kinisi-gym-launch",
    titleEl: "Γυμναστήριο Κίνηση: η επανέναρξη",
    titleEn: "Kinisi Gym: the relaunch",
    summaryEl:
      "Οκτώ reels σε έναν μήνα για το νέο πρόγραμμα του γυμναστηρίου.",
    summaryEn: "Eight reels in one month for the gym's new programme.",
    video: { host: "Vimeo", url: "https://vimeo.com/000000001" },
    cover: "Εξώφυλλο: προπόνηση με φυσικό φως",
    sectorIds: ["sec-social"],
    clientId: "kinisi",
    isOwnProduction: false,
    isFeatured: true,
    consent: given(
      "2026-08-28",
      "Άννα Δημητρίου",
      "Email του Σταύρου Μπαλτά, 28/8",
      "email-kinisi-consent.pdf",
    ),
    storyEl: {
      challenge:
        "Το γυμναστήριο άνοιγε ξανά μετά από ανακαίνιση και ήθελε να το μάθει η γειτονιά μέσα σε έναν μήνα.",
      solution:
        "Δύο Γυρίσματα με προπονητές και μέλη, οκτώ σύντομα reels με ένα σταθερό ύφος.",
      result: "Όλες οι θέσεις του πρώτου κύκλου γέμισαν πριν την πρεμιέρα.",
    },
    storyEn: {
      challenge:
        "The gym was reopening after a refurbishment and wanted the neighbourhood to know within a month.",
      solution:
        "Two shoots with trainers and members, eight short reels in one consistent style.",
      result: "Every spot in the first cycle was booked before opening day.",
    },
    isShown: true,
    order: 1,
    updated: { when: "2026-09-01", by: "Δημήτρης Ιωάννου" },
  },
  {
    id: "work-kypseli",
    slug: "kypseli-cafe",
    titleEl: "Κυψέλη Καφέ: ο καφές της γειτονιάς",
    titleEn: "Kypseli Café: the neighbourhood coffee",
    summaryEl: "Μηνιαία reels για το καφέ και τα νέα του κατάστημα.",
    summaryEn: "Monthly reels for the café and its new shop.",
    video: { host: "YouTube", url: "https://youtube.com/watch?v=0000000002" },
    cover: "Εξώφυλλο: φλιτζάνι και ατμός στον πάγκο",
    sectorIds: ["sec-social"],
    clientId: "kypseli",
    isOwnProduction: false,
    isFeatured: true,
    consent: given(
      "2026-09-04",
      "Άννα Δημητρίου",
      "Email της Μαρίας Παπαδάκη, 4/9",
    ),
    storyEl: {
      challenge:
        "Το καφέ ήθελε να φαίνεται κάθε μήνα στη γειτονιά, χωρίς να χάνει ώρα από τη δουλειά.",
      solution:
        "Δύο Γυρίσματα τον μήνα στον χώρο, οκτώ σύντομα reels έτοιμα για ανάρτηση.",
      result: "Οι ακόλουθοι διπλασιάστηκαν μέσα σε δύο μήνες.",
    },
    isShown: true,
    order: 2,
    updated: { when: "2026-09-06", by: "Άννα Δημητρίου" },
  },
  {
    id: "work-armyra",
    slug: "armyra-summer",
    titleEl: "Ταβέρνα Αρμύρα: καλοκαίρι στη θάλασσα",
    summaryEl: "Τρία βίντεο για τη νέα καλοκαιρινή κουζίνα της ταβέρνας.",
    video: { host: "Vimeo", url: "https://vimeo.com/000000003" },
    cover: "Εξώφυλλο: τραπέζι δίπλα στο κύμα",
    sectorIds: ["sec-social"],
    clientId: "armyra",
    isOwnProduction: false,
    isFeatured: false,
    consent: given(
      "2026-07-15",
      "Νίκος Βασιλείου",
      "Όρος στη Συμφωνία, άρθρο 9",
    ),
    isShown: true,
    order: 3,
    updated: { when: "2026-07-20", by: "Νίκος Βασιλείου" },
  },
  {
    id: "work-athina",
    slug: "athina-coffee",
    titleEl: "Καφέ Αθηνά: πρωινός καφές",
    summaryEl: "Σειρά βίντεο για το πρωινό μενού.",
    video: { host: "YouTube", url: "https://youtube.com/watch?v=0000000005" },
    cover: "Εξώφυλλο: φλιτζάνι στον πάγκο",
    sectorIds: ["sec-social"],
    clientId: "athina",
    isOwnProduction: false,
    isFeatured: false,
    consent: {
      isGiven: false,
      history: [
        {
          action: "δόθηκε",
          date: "2026-09-02",
          by: "Νίκος Βασιλείου",
          how: "Email της Μαρίας Σιμιτζή, 2/9",
        },
        {
          action: "ανακλήθηκε",
          date: "2026-09-15",
          by: "Νίκος Βασιλείου",
          how: "Τηλεφώνησε η Μαρία Σιμιτζή: αλλάζουν brand",
        },
      ],
    },
    isShown: false,
    order: 5,
    updated: { when: "2026-09-15", by: "Νίκος Βασιλείου" },
  },
  {
    id: "work-showreel",
    slug: "showreel-2026",
    titleEl: "Showreel 2026",
    titleEn: "Showreel 2026",
    summaryEl: "Ό,τι κάναμε φέτος, σε ενενήντα δευτερόλεπτα.",
    summaryEn: "Our year in ninety seconds.",
    video: { host: "Vimeo", url: "https://vimeo.com/000000006" },
    cover: "Εξώφυλλο: κάμερα σε γερανό",
    sectorIds: [],
    isOwnProduction: true,
    isFeatured: true,
    consent: NONE,
    isShown: true,
    order: 0,
    updated: { when: "2026-09-08", by: "Γιώργος Μαυρίδης" },
  },
];

export const LOGOS: readonly ClientLogo[] = [
  {
    id: "logo-kinisi",
    clientName: "Γυμναστήριο Κίνηση",
    clientId: "kinisi",
    image: "kinisi.svg",
    consent: given(
      "2026-08-28",
      "Άννα Δημητρίου",
      "Μαζί με τη Συναίνεση της Δουλειάς",
    ),
    isShown: true,
    order: 1,
    updated: { when: "2026-08-28", by: "Άννα Δημητρίου" },
  },
  {
    id: "logo-athina",
    clientName: "Καφέ Αθηνά",
    clientId: "athina",
    image: "athina.svg",
    consent: {
      isGiven: false,
      history: [
        {
          action: "δόθηκε",
          date: "2026-09-02",
          by: "Νίκος Βασιλείου",
          how: "Email της Μαρίας Σιμιτζή, 2/9",
        },
        {
          action: "ανακλήθηκε",
          date: "2026-09-15",
          by: "Νίκος Βασιλείου",
          how: "Τηλεφώνησε η Μαρία Σιμιτζή: αλλάζουν brand",
        },
      ],
    },
    isShown: false,
    order: 2,
    updated: { when: "2026-09-15", by: "Νίκος Βασιλείου" },
  },
  {
    id: "logo-armyra",
    clientName: "Ταβέρνα Αρμύρα",
    clientId: "armyra",
    image: "armyra.svg",
    consent: given(
      "2026-07-15",
      "Νίκος Βασιλείου",
      "Όρος στη Συμφωνία, άρθρο 9",
    ),
    isShown: true,
    order: 3,
    updated: { when: "2026-07-15", by: "Νίκος Βασιλείου" },
  },
  {
    id: "logo-kypseli",
    clientName: "Κυψέλη Καφέ",
    clientId: "kypseli",
    image: "kypseli.svg",
    consent: NONE,
    isShown: false,
    order: 4,
    updated: { when: "2026-09-19", by: "Δημήτρης Ιωάννου" },
  },
];

export const TEAM_CARDS: readonly TeamCard[] = [
  {
    id: "tc-giorgos",
    userId: "giorgos",
    name: "Γιώργος Μαυρίδης",
    nameEn: "Giorgos Mavridis",
    titleEl: "Ιδρυτής, σκηνοθέτης",
    titleEn: "Founder, director",
    photo: "giorgos.jpg",
    consent: given("2026-09-01", "Γιώργος Μαυρίδης", "Ο ίδιος"),
    isShown: true,
    order: 1,
    updated: { when: "2026-09-01", by: "Γιώργος Μαυρίδης" },
  },
  {
    id: "tc-aris",
    userId: "aris",
    name: "Άρης Κωνσταντίνου",
    nameEn: "Aris Konstantinou",
    titleEl: "Διευθυντής φωτογραφίας",
    titleEn: "Director of photography",
    photo: "aris.jpg",
    consent: given("2026-09-02", "Δημήτρης Ιωάννου", "Email του Άρη, 2/9"),
    isShown: true,
    order: 2,
    updated: { when: "2026-09-02", by: "Δημήτρης Ιωάννου" },
  },
  {
    id: "tc-sofia",
    userId: "sofia",
    name: "Σοφία Λαζαρίδου",
    titleEl: "Μοντέρ",
    photo: "sofia.jpg",
    consent: NONE,
    isShown: false,
    order: 3,
    updated: { when: "2026-09-10", by: "Δημήτρης Ιωάννου" },
  },
  {
    id: "tc-petros",
    userId: "petros",
    name: "Πέτρος Αλεξίου",
    titleEl: "Ηχολήπτης",
    photo: "petros.jpg",
    consent: given("2026-06-05", "Γιώργος Μαυρίδης", "Ο ίδιος, με email"),
    isShown: false, // κρύφτηκε μόνο του όταν απενεργοποιήθηκε ο Χρήστης
    order: 4,
    updated: { when: "2026-08-30", by: "σύστημα" },
  },
];

// Η φόρμα ενδιαφέροντος (R7): πεδία, όρια, προστασίες.
export interface FormField {
  id: string;
  labelEl: string;
  labelEn: string;
  isRequired: boolean;
  note?: string;
}

export const INTEREST_FORM_FIELDS: readonly FormField[] = [
  {
    id: "name",
    labelEl: "Ονοματεπώνυμο",
    labelEn: "Full name",
    isRequired: true,
  },
  { id: "email", labelEl: "Email", labelEn: "Email", isRequired: true },
  { id: "phone", labelEl: "Τηλέφωνο", labelEn: "Phone", isRequired: false },
  {
    id: "company",
    labelEl: "Επιχείρηση",
    labelEn: "Business",
    isRequired: false,
  },
  {
    id: "interest",
    labelEl: "Τι σας ενδιαφέρει",
    labelEn: "What are you interested in",
    isRequired: false,
    note: "δημόσιοι Τομείς και Πακέτα· προσυμπληρωμένο από σελίδα Τομέα",
  },
  {
    id: "message",
    labelEl: "Πείτε μας λίγα λόγια",
    labelEn: "Tell us a little",
    isRequired: true,
    note: "έως 2.000 χαρακτήρες",
  },
];

export const FORM_LIMITS = {
  perAddressPerHour: 3,
  messageMaxChars: 2000,
};

// Αρχείο συναινέσεων cookies (δείγμα): ανά επιλογή, ημερομηνία και έκδοση πολιτικής.
export const COOKIE_POLICY_VERSION = "1.0 · 2026-09-01";

export const COOKIE_CATEGORIES = [
  {
    id: "necessary",
    labelEl: "Απαραίτητα",
    labelEn: "Necessary",
    textEl:
      "Για να δουλεύει η σελίδα, η είσοδος και ο έλεγχος ανθρώπου. Δεν κλείνουν.",
    textEn: "Needed for the site, sign-in and the human check. Always on.",
    isLocked: true,
  },
  {
    id: "statistics",
    labelEl: "Στατιστικά",
    labelEn: "Statistics",
    textEl: "Google Analytics: πόσοι μας επισκέπτονται και από πού.",
    textEn: "Google Analytics: how many people visit and from where.",
    isLocked: false,
  },
  {
    id: "marketing",
    labelEl: "Marketing",
    labelEn: "Marketing",
    textEl: "Meta Pixel: για να μετράμε τις διαφημίσεις μας.",
    textEn: "Meta Pixel: to measure our ads.",
    isLocked: false,
  },
] as const;

// Σύνδεσμοι που δεν δουλεύουν πια (R13): είδος, λόγος, τι κάνει ο άνθρωπος μετά.
export type DeadLinkKind =
  "πρόσκληση" | "επαναφορά" | "είσοδος" | "πρόταση" | "παλιό σύστημα";

export interface DeadLinkCase {
  id: string;
  kind: DeadLinkKind;
  reasonEl: string;
  reasonEn: string;
  nextEl: string;
  nextEn: string;
}

export const DEAD_LINK_CASES: readonly DeadLinkCase[] = [
  {
    id: "invite-expired",
    kind: "πρόσκληση",
    reasonEl: "Η πρόσκληση έληξε: ισχύει 7 μέρες.",
    reasonEn: "This invitation has expired: invitations last 7 days.",
    nextEl: "Ζητήστε νέα πρόσκληση από όποιον σας προσκάλεσε.",
    nextEn: "Ask whoever invited you for a new one.",
  },
  {
    id: "invite-replaced",
    kind: "πρόσκληση",
    reasonEl: "Στάλθηκε νεότερη πρόσκληση και αυτή ακυρώθηκε.",
    reasonEn: "A newer invitation was sent, so this one no longer works.",
    nextEl: "Ανοίξτε το πιο πρόσφατο email πρόσκλησης.",
    nextEn: "Open the most recent invitation email.",
  },
  {
    id: "invite-used",
    kind: "πρόσκληση",
    reasonEl: "Η πρόσκληση έχει ήδη χρησιμοποιηθεί.",
    reasonEn: "This invitation has already been used.",
    nextEl: "Συνδεθείτε κανονικά από την Είσοδο.",
    nextEn: "Sign in from the sign-in page.",
  },
  {
    id: "reset-expired",
    kind: "επαναφορά",
    reasonEl: "Ο σύνδεσμος επαναφοράς έληξε ή χρησιμοποιήθηκε ήδη.",
    reasonEn: "This reset link has expired or was already used.",
    nextEl: "Ζητήστε νέο σύνδεσμο επαναφοράς.",
    nextEn: "Request a new reset link.",
  },
  {
    id: "magic-expired",
    kind: "είσοδος",
    reasonEl: "Ο σύνδεσμος εισόδου έληξε ή χρησιμοποιήθηκε ήδη.",
    reasonEn: "This sign-in link has expired or was already used.",
    nextEl: "Ζητήστε νέο σύνδεσμο από την Είσοδο.",
    nextEn: "Request a new link from the sign-in page.",
  },
  {
    id: "proposal-expired",
    kind: "πρόταση",
    reasonEl: "Η πρόταση έληξε.",
    reasonEn: "This proposal has expired.",
    nextEl: "Επικοινωνήστε με {Υπεύθυνο} για παράταση.",
    nextEn: "Contact {owner} to extend it.",
  },
  {
    id: "proposal-revoked",
    kind: "πρόταση",
    reasonEl: "Ο σύνδεσμος ανακλήθηκε.",
    reasonEn: "This link was revoked.",
    nextEl: "Επικοινωνήστε με {Υπεύθυνο}.",
    nextEn: "Contact {owner}.",
  },
  {
    id: "proposal-newer",
    kind: "πρόταση",
    reasonEl: "Υπάρχει νεότερη έκδοση της πρότασης.",
    reasonEn: "There is a newer version of this proposal.",
    nextEl: "Ανοίξτε τον σύνδεσμο από το πιο πρόσφατο email.",
    nextEn: "Open the link in the most recent email.",
  },
  {
    id: "proposal-signed",
    kind: "πρόταση",
    reasonEl: "Η πρόταση έχει ήδη υπογραφεί.",
    reasonEn: "This proposal has already been signed.",
    nextEl: "Θα λάβετε πρόσκληση στον λογαριασμό σας.",
    nextEn: "You will receive an invitation to your account.",
  },
  {
    id: "proposal-closed",
    kind: "πρόταση",
    reasonEl: "Η πρόταση δεν είναι πια ανοιχτή.",
    reasonEn: "This proposal is no longer open.",
    nextEl: "Επικοινωνήστε με {Υπεύθυνο}.",
    nextEn: "Contact {owner}.",
  },
  {
    id: "old-system",
    kind: "παλιό σύστημα",
    reasonEl: "Ο σύνδεσμος είναι από το προηγούμενο σύστημα.",
    reasonEn: "This link comes from our previous system.",
    nextEl: "Επικοινωνήστε μαζί μας και θα σας στείλουμε νέο.",
    nextEn: "Contact us and we will send you a new one.",
  },
];
