import type { SystemMessageCode } from "./system-texts";

// Τα προεπιλεγμένα κείμενα των Μηνυμάτων συστήματος, όπως τα δείχνει η K2 (#173): ίδια με τα πρότυπα του κώδικα
// (templates/auth-messages, agreement-messages, system-messages), γραμμένα με μεταβλητές. Όσο ο admin δεν αλλάζει
// τίποτα, φεύγει το κείμενο του κώδικα.

export interface SystemDefault {
  title: string;
  when: string;
  note: string;
  subject: { el: string; en: string };
  body: { el: string; en: string };
}

export const SYSTEM_DEFAULTS: Record<SystemMessageCode, SystemDefault> = {
  invite: {
    title: "Πρόσκληση",
    when: "Όταν προσκαλείται Χρήστης ομάδας ή πελάτη, όταν ξαναστέλνεται η πρόσκληση, και στον Υπογράφοντα μετά την υπογραφή.",
    note: "Η είσοδος είναι μόνο με πρόσκληση. Ο σύνδεσμος ισχύει 24 ώρες. Χωρίς αλλαγή, η πρόσκληση πελάτη αναφέρει και τον Πελάτη.",
    subject: {
      el: "Πρόσκληση στο DMS: {place}",
      en: "Invitation to DMS: {place}",
    },
    body: {
      el: "Γεια σου {recipientName},\n\nΣε προσκάλεσαν να μπεις στο σύστημα της Devre Media.\n\nΠάτα το κουμπί, όρισε τον κωδικό σου και μπες. Ο σύνδεσμος ισχύει 24 ώρες.",
      en: "Hello {recipientName},\n\nYou were invited to join the Devre Media system.\n\nPress the button, set your password and sign in. The link is valid for 24 hours.",
    },
  },
  magic_link: {
    title: "Σύνδεσμος εισόδου",
    when: "Όταν ο Χρήστης ζητά είσοδο με σύνδεσμο.",
    note: "Ο σύνδεσμος ισχύει 24 ώρες και μία φορά.",
    subject: {
      el: "Devre Media · Σύνδεσμος εισόδου",
      en: "Devre Media · Sign-in link",
    },
    body: {
      el: "Πάτα το κουμπί για να μπεις. Ο σύνδεσμος ισχύει 24 ώρες και μπορεί να χρησιμοποιηθεί μία φορά.",
      en: "Press the button to sign in. The link is valid for 24 hours and works once.",
    },
  },
  recovery: {
    title: "Επαναφορά κωδικού",
    when: "Όταν ο Χρήστης ξεχάσει τον κωδικό του.",
    note: "Ο σύνδεσμος ισχύει 24 ώρες και μία φορά.",
    subject: {
      el: "Devre Media · Επαναφορά κωδικού",
      en: "Devre Media · Password reset",
    },
    body: {
      el: "Πάτα το κουμπί για να ορίσεις νέο κωδικό. Αν δεν το ζήτησες, αγνόησε αυτό το μήνυμα.",
      en: "Press the button to set a new password. If you did not ask for this, ignore this message.",
    },
  },
  signing_code: {
    title: "Κωδικός υπογραφής",
    when: "Όταν ο Υπογράφων επιβεβαιώνει την υπογραφή.",
    note: "Ο κωδικός ισχύει 10 λεπτά. Χωρίς τον {code} ο Υπογράφων δεν μπορεί να υπογράψει.",
    subject: {
      el: "Κωδικός υπογραφής: {agreement}",
      en: "Signing code: {agreement}",
    },
    body: {
      el: "Γεια σου {recipientName},\n\nΟ κωδικός υπογραφής σου είναι: {code}. Ισχύει 10 λεπτά.",
      en: "Hello {recipientName},\n\nYour signing code is: {code}. It is valid for 10 minutes.",
    },
  },
  proposal_link: {
    title: "Αποστολή Συνδέσμου πρότασης",
    when: "Όταν η ομάδα στέλνει πρόταση. Κάθε παραλήπτης παίρνει τον δικό του σύνδεσμο.",
    note: "Φεύγει στη γλώσσα του παραλήπτη. Το κουμπί ανοίγει την πρόταση.",
    subject: { el: "Πρόταση: {agreement}", en: "Proposal: {agreement}" },
    body: {
      el: "Γεια σου {recipientName},\n\nΣου στέλνουμε την πρόταση για έλεγχο και υπογραφή.",
      en: "Hello {recipientName},\n\nWe are sending you the proposal to review and sign.",
    },
  },
  signed_copy: {
    title: "Αντίγραφο υπογεγραμμένης",
    when: "Μετά την υπογραφή, σε όσους παίρνουν αντίγραφο.",
    note: "Χωρίς Υπεύθυνο γράφει «η ομάδα της Devre Media».",
    subject: { el: "Υπογεγραμμένη: {agreement}", en: "Signed: {agreement}" },
    body: {
      el: "Γεια σου {recipientName},\n\nΗ πρόταση «{agreement}» υπογράφηκε. Ο υπεύθυνος είναι {manager}.",
      en: "Hello {recipientName},\n\nThe proposal “{agreement}” was signed. The account manager is {manager}.",
    },
  },
  client_added: {
    title: "Προσθήκη σε Πελάτη",
    when: "Όταν ένας υπάρχων λογαριασμός προστίθεται σε ακόμα έναν Πελάτη.",
    note: "Το κουμπί ανοίγει το σύστημα με σύνδεσμο εισόδου.",
    subject: {
      el: "Devre Media · Πρόσβαση στον Πελάτη {clientName}",
      en: "Devre Media · Access to client {clientName}",
    },
    body: {
      el: "Γεια σου {recipientName},\n\nΠρόσθεσαν τον λογαριασμό σου στον Πελάτη «{clientName}». Μπορείς να μπεις και να διαλέξεις τον Πελάτη από την κεφαλίδα.",
      en: "Hello {recipientName},\n\nYour account was added to the client “{clientName}”. Sign in and choose the client from the header.",
    },
  },
};

// Φανταστικές τιμές για την προεπισκόπηση.
export const PREVIEW_VALUES: Readonly<Record<string, string>> = {
  recipientName: "Μαρία Παπαδάκη",
  place: "Κυψέλη Καφέ",
  clientName: "Κυψέλη Καφέ",
  link: "https://dms.example.com/l/k7x2p",
  agreement: "Μηνιαίο πακέτο 2026",
  code: "482913",
  manager: "Άννα",
};
