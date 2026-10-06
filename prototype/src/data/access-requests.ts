// Φανταστικά εκκρεμή Αιτήματα πρόσβασης («Ένας Πελάτης, ένας πωλητής»). Μόνο επινοημένα στοιχεία.

export interface AccessRequest {
  id: string;
  requesterId: string;
  clientId: string;
  topic: string;
  comment: string;
  date: string;
}

export const ACCESS_REQUESTS: readonly AccessRequest[] = [
  {
    id: "ar-nikos-kinisi",
    requesterId: "nikos",
    clientId: "kinisi",
    topic: "Βίντεο για καμπάνια Black Friday",
    comment:
      "Ο Πελάτης ρώτησε για προωθητικό βίντεο· τον ξέρω από παλιά συνεργασία.",
    date: "2026-09-19",
  },
  {
    id: "ar-anna-athina",
    requesterId: "anna",
    clientId: "athina",
    topic: "Πακέτο podcast",
    comment: "Η κ. Σιμιτζή ζήτησε προσφορά για podcast, όχι για social.",
    date: "2026-09-18",
  },
];
