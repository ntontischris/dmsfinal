// Κοινό φανταστικό περιεχόμενο για τις τρεις κατευθύνσεις. Μόνο επινοημένα ονόματα:
// το repo είναι public. Τα κείμενα της Ιστοσελίδας είναι πρόχειρα, όχι τελικά.

export interface Work {
  title: string;
  client: string;
  kind: string;
  duration: string;
  hue: number;
}

export const WORKS: readonly Work[] = [
  {
    title: "Εγκαίνια δεύτερου καταστήματος",
    client: "Κυψέλη Καφέ",
    kind: "Εταιρικό βίντεο",
    duration: "01:32",
    hue: 55,
  },
  {
    title: "Ανάσα, μια καμπάνια",
    client: "Φάρος Γιόγκα",
    kind: "Διαφημιστικό",
    duration: "00:45",
    hue: 220,
  },
  {
    title: "Τρεις μέρες στο λιμάνι",
    client: "Ορίζων Ναυτιλιακή",
    kind: "Μίνι ντοκιμαντέρ",
    duration: "06:10",
    hue: 250,
  },
  {
    title: "Το φεστιβάλ σε 90″",
    client: "Αλμυρό Φεστιβάλ",
    kind: "Aftermovie",
    duration: "01:30",
    hue: 20,
  },
  {
    title: "Ψωμί από την αρχή",
    client: "Πλάτανος Αρτοποιείο",
    kind: "Social media",
    duration: "8 reels",
    hue: 80,
  },
];

export interface Service {
  title: string;
  line: string;
}

export const SERVICES: readonly Service[] = [
  {
    title: "Εταιρικά βίντεο",
    line: "Η ιστορία της εταιρείας σας, από το σενάριο ως το τελικό μοντάζ.",
  },
  {
    title: "Social media",
    line: "Μηνιαία πακέτα με Γυρίσματα και reels, σταθερά κάθε μήνα.",
  },
  {
    title: "Εκδηλώσεις",
    line: "Εγκαίνια, συνέδρια, φεστιβάλ: γύρισμα και aftermovie.",
  },
  {
    title: "Διαφημιστικά",
    line: "Σποτ για TV και online, με casting και παραγωγή.",
  },
];

export const CLIENT_LOGOS: readonly string[] = [
  "Κυψέλη Καφέ",
  "Φάρος Γιόγκα",
  "Ορίζων",
  "Αλμυρό Φεστιβάλ",
  "Πλάτανος",
  "Νήμα Ενδύματα",
];

export interface ClientActivity {
  when: string;
  what: string;
}

// Η ζωντανή εικόνα του φανταστικού πελάτη στη Σελίδα Πελάτη (συμπληρώνει το fictional-client.ts).
export const CLIENT_SNAPSHOT = {
  nextShoot: {
    date: "Τρ 14/10",
    time: "10:00",
    place: "Κατάστημα Καλαμαριάς",
    crew: "Γιώργος, Ελένη",
  },
  periodUsage: { shoots: { used: 1, of: 2 }, reels: { used: 5, of: 8 } },
  pendingApproval: 2,
  openBalance: 900,
  activity: [
    {
      when: "Σήμερα 11:20",
      what: "Η Μαρία Παπαδάκη ενέκρινε το reel «Πρωινός καφές»",
    },
    { when: "Χθες", what: "Ανέβηκαν 2 Παραδοτέα για έγκριση" },
    { when: "1/10", what: "Εκδόθηκε Τιμολόγιο Σεπτεμβρίου, 900 €" },
    {
      when: "28/9",
      what: "Στάλθηκε πρόταση «Βίντεο εγκαινίων δεύτερου καταστήματος»",
    },
  ] as readonly ClientActivity[],
};

export const formatEuro = (amount: number): string =>
  `${amount.toLocaleString("el-GR")} €`;
