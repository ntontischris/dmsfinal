// Κείμενα της P2 «Υγεία συστήματος» κατά το prototype (screens/P2.tsx, p2-parts, p2-more, p2-down).

export const HEALTH_PATH = "/app/health";
export const HEALTH_TITLE = "Υγεία συστήματος";
export const HEALTH_EYEBROW = "P2 · Διατομεακά";
export const HEALTH_NO_ACCESS =
  "Την Υγεία συστήματος τη βλέπει όποιος έχει το «Βλέπει Υγεία συστήματος».";
export const HEALTH_LOAD_ERROR_TITLE = "Η Υγεία συστήματος δεν φόρτωσε";
export const HEALTH_LOAD_ERROR_TEXT =
  "Δεν χάθηκε τίποτα. Ξαναφόρτωσε τη σελίδα σε λίγο.";
export const HEALTH_FRESH_TITLE = "Το σύστημα είναι καινούργιο";
export const HEALTH_FRESH_TEXT =
  "Τίποτα δεν έχει τρέξει ακόμα. Μόλις τρέξει η πρώτη προγραμματισμένη εργασία ή αποστολή, θα φανεί εδώ.";
export const BANNER_NOTE =
  "Ό,τι κοκκινίζει στέλνει Ειδοποίηση και email και πρασινίζει μόνο του όταν διορθωθεί.";
export const ACTIONS_NOTE =
  "Κάθε ενέργεια γράφεται στο Ίχνος, με το όνομά σου.";

export const redNote = (event: number): string =>
  `Στέλνει Ειδοποίηση και email (Γεγονός ${event}). Πρασινίζει μόνο του όταν διορθωθεί.`;

export const EXTERNAL = {
  title: "Εξωτερικός έλεγχος",
  setUp:
    "Μια εξωτερική υπηρεσία ελέγχει το /api/health κάθε 3 λεπτά, έξω από το DMS.",
  notSetUp:
    "Ο εξωτερικός έλεγχος δεν έχει στηθεί ακόμα. Μέχρι να στηθεί, αν σταματήσει όλο το σύστημα δεν θα το μάθει κανείς. Τον στήνει ο Ιδιοκτήτης με τον developer, όπως γράφει ο οδηγός «Ημέρα σύνδεσης» (Better Stack).",
  open: "Άνοιγμα του ελέγχου",
  downTitle: "Τι γίνεται όταν δεν απαντά",
  downText: [
    "Όταν το DMS δεν απαντά, δεν μπορεί να στείλει το ίδιο email. Το στέλνει η υπηρεσία του εξωτερικού ελέγχου, μετά από 2 αποτυχημένους ελέγχους στη σειρά (περίπου 6 λεπτά).",
    "Το email πηγαίνει στον Ιδιοκτήτη και στον developer. Όταν το σύστημα επανέλθει, φτάνει δεύτερο email «επανήλθε».",
    "Ο έλεγχος κοκκινίζει και όταν η σελίδα ανοίγει αλλά η ουρά email δεν έχει τρέξει για πάνω από 10 λεπτά: σημαίνει ότι σταμάτησαν τα αυτόματα.",
    "Δεν χρειάζεται να κάνεις κάτι στο DMS. SMS και push θα έρθουν μετά την πρώτη έκδοση.",
  ],
} as const;

export const JOBS = {
  title: "Προγραμματισμένες εργασίες",
  name: "Εργασία",
  schedule: "Πότε τρέχει",
  lastRun: "Τελευταία επιτυχία",
  state: "Κατάσταση",
  error: "Τελευταίο σφάλμα",
} as const;

export const SENDS = {
  title: "Αποστολές που απέτυχαν",
  empty: "Καμία αποστολή δεν απέτυχε τις τελευταίες 7 μέρες.",
  more: (shown: number, total: number) =>
    `Φαίνονται ${shown} από ${total}. Όλες είναι στο Ιστορικό αποστολών.`,
  history: "Ιστορικό αποστολών",
  resend: "Ξαναστείλε",
  ignore: "Αγνόησε",
  resendConfirm: "Η ίδια αποστολή ξαναμπαίνει στην ουρά, μία φορά.",
  ignoreConfirm:
    "Η αποστολή φεύγει από την Υγεία και μένει στο Ιστορικό αποστολών ως «αγνοήθηκε».",
  confirmYes: "Ναι",
  cancel: "Άκυρο",
  reason: "λόγος",
  resent: "Η αποστολή ξαναμπήκε στην ουρά. Η ενέργεια γράφτηκε στο Ίχνος.",
  ignored: "Η αποστολή αγνοήθηκε. Η ενέργεια γράφτηκε στο Ίχνος.",
} as const;

export const GOOGLE = {
  title: "Συγχρονισμός Google",
  lastSync: "Τελευταίος συγχρονισμός",
  queued: "Αλλαγές σε ουρά",
  rule: "Γίνεται κόκκινο αν ο συγχρονισμός δεν πετυχαίνει για πάνω από 30 λεπτά (Γεγονός 52).",
} as const;

export const EVENTS = {
  title: "Γεγονότα που κόλλησαν",
  empty: "Κανένα. Όλα τα Γεγονότα επεξεργάστηκαν.",
  waiting: (count: number) =>
    `${count} Γεγονότα περιμένουν πάνω από 15 λεπτά να επεξεργαστούν.`,
  since: "από",
  attempts: (count: number) => `${count} προσπάθειες`,
  retry: "Ξαναδοκίμασε",
  retryConfirm:
    "Το Γεγονός ξαναμπαίνει στην ουρά. Όσοι το πήραν ήδη δεν το ξαναπαίρνουν.",
  retried:
    "Το Γεγονός ξαναμπήκε στην ουρά. Όσοι το πήραν ήδη δεν το ξαναπαίρνουν. Η ενέργεια γράφτηκε στο Ίχνος.",
} as const;

export const AI = {
  title: "Πλαφόν Βοηθού",
  closed: "Το πλαφόν είναι 0: το AI είναι κλειστό.",
  rule: (share: number) =>
    `Στο ${share}% σταματά ο Βοηθός της Ιστοσελίδας, στο 100% και ο Βοηθός μέσα στο σύστημα. Ειδοποίηση και email και στις δύο περιπτώσεις (Γεγονός 57).`,
  changeOwner: "Το πλαφόν αλλάζει στις Ρυθμίσεις › Εταιρεία › Βοηθός.",
  changeOthers: "Το πλαφόν το αλλάζει μόνο ο Ιδιοκτήτης.",
} as const;

const DATE_TIME = new Intl.DateTimeFormat("el-GR", {
  timeZone: "Europe/Athens",
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
  hour12: false,
});

export const formatAt = (value: string | null): string => {
  if (!value) return "—";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "—" : DATE_TIME.format(date);
};

const USD = new Intl.NumberFormat("el-GR", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

export const formatUsd = (micros: number): string =>
  `${USD.format(micros / 1_000_000)} USD`;
