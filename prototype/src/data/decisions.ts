// Τα ανοιχτά ερωτήματα που δείχνει το πάνελ «Αποφάσεις εδώ».
// Το πάνελ μόνο δείχνει: η απόφαση γράφεται στο Blueprint και μετά το ερώτημα σβήνεται από εδώ.
// Κάθε ticket module προσθέτει τα ερωτήματα των κεφαλαίων του, με επιλογές και σύσταση.

export interface OpenDecision {
  id: string;
  question: string;
  options: readonly string[];
  recommendation?: string;
  source: { label: string; href: string };
  screens: readonly string[];
}

const BLUEPRINT =
  "https://github.com/ntontischris/dmsfinal/blob/main/docs/blueprint";
const CH8_QUESTIONS = {
  label: "Κεφ. 8, Ανοιχτά ερωτήματα",
  href: `${BLUEPRINT}/08-role-guides.md#-ανοιχτά-ερωτήματα`,
};

const ch8 = (
  number: number,
  question: string,
  screens: readonly string[],
): OpenDecision => ({
  id: `ch8-q${number}`,
  question,
  options: [],
  source: {
    label: `${CH8_QUESTIONS.label} #${number}`,
    href: CH8_QUESTIONS.href,
  },
  screens,
});

const chapter = (
  file: "01-backbone",
  label: string,
  number: number,
  question: string,
  options: readonly string[],
  recommendation: string,
  screens: readonly string[],
): OpenDecision => ({
  id: `${file}-q${number}`,
  question,
  options,
  recommendation,
  source: {
    label: `${label} #${number}`,
    href: `${BLUEPRINT}/03-processes/${file}.md#-ανοιχτά-ερωτήματα`,
  },
  screens,
});

const backbone = (
  number: number,
  question: string,
  options: readonly string[],
  recommendation: string,
  screens: readonly string[],
) =>
  chapter(
    "01-backbone",
    "Κεφ. 3.1 Ραχοκοκαλιά, Ανοιχτά ερωτήματα",
    number,
    question,
    options,
    recommendation,
    screens,
  );


export const OPEN_DECISIONS: readonly OpenDecision[] = [
  backbone(
    1,
    "Είσπραξη πριν το Τιμολόγιο: τι γίνεται αν έρθει χρήμα χωρίς ανοιχτό Τιμολόγιο (π.χ. προκαταβολή);",
    [
      "Μένει ως πίστωση στον λογαριασμό του Πελάτη και εξοφλεί το επόμενο Τιμολόγιο",
      "Δεν επιτρέπεται καταχώρηση χωρίς Τιμολόγιο",
    ],
    "Πίστωση στον λογαριασμό: το «Υπόλοιπο» της Καρτέλας Πελάτη μπορεί να βγει αρνητικό.",
    ["I3", "I4", "I5"],
  ),
  ch8(
    3,
    "Κανάλια Μηνυμάτων: μία Συνομιλία ανά Πελάτη με Εσωτερικά Μηνύματα αντί για «δύο κανάλια ανά Παραγωγή». Να επιβεβαιωθεί.",
    ["J2"],
  ),
  ch8(
    8,
    "Ποιος διαλέγει τον Ρόλο μιας νέας πρόσκλησης, και ποιος εκτελεί αίτημα GDPR (ανωνυμοποίηση);",
    ["N1", "N4"],
  ),
  ch8(10, "Υγεία συστήματος: ποιο Δικαίωμα την ανοίγει;", ["P2"]),
  ch8(
    11,
    "Αναφορές: ποιες είναι οι έτοιμες αναφορές και υπάρχει builder στο v1;",
    ["M1"],
  ),
  ch8(
    13,
    "Ενσωματώσεις και συνδρομές: τι ακριβώς βλέπει και αλλάζει ο Ιδιοκτήτης;",
    ["N5"],
  ),
  ch8(
    14,
    "Ρυθμίσεις χωρίς ενότητα: Google ημερολόγιο, όρια δημόσιου widget, email απαντήσεων, χρονισμός υπενθύμισης Πελάτη. Σε ποια ενότητα πάνε;",
    ["O1", "O4"],
  ),
  ch8(
    17,
    "Κάρτες «Σήμερα»: ποια είναι η προεπιλεγμένη σειρά και σύνθεση ανά Ρόλο;",
    ["A1"],
  ),
];

export const decisionsFor = (code: string): readonly OpenDecision[] =>
  OPEN_DECISIONS.filter((decision) => decision.screens.includes(code));
