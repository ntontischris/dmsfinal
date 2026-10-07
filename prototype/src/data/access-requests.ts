// Φανταστικά εκκρεμή Αιτήματα πρόσβασης («Ένας Πελάτης, ένας πωλητής»). Μόνο επινοημένα στοιχεία.

// Το μήνυμα ζει εδώ και όχι στο «use client» αρχείο της φόρμας: το καλούν και Server Components.
export const takenMessage = (ownerName: string | null): string =>
  ownerName
    ? `Ο Πελάτης ανήκει στον/στην ${ownerName}. Για νέα Ευκαιρία ζήτα πρόσβαση από τη Διαχείριση.`
    : "Ο Πελάτης δεν έχει ακόμα Υπεύθυνο. Για νέα Ευκαιρία ζήτα πρόσβαση από τη Διαχείριση.";

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
