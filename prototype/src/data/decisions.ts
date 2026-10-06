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
  file: "01-backbone" | "03-catalogue-agreement-cost",
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

const catalogue = (
  number: number,
  question: string,
  options: readonly string[],
  recommendation: string,
  screens: readonly string[],
) =>
  chapter(
    "03-catalogue-agreement-cost",
    "Κεφ. 3.3 Κατάλογος, Συμφωνία, κόστος, Ανοιχτά ερωτήματα",
    number,
    question,
    options,
    recommendation,
    screens,
  );

export const OPEN_DECISIONS: readonly OpenDecision[] = [
  catalogue(
    4,
    "Έλεγχος του πραγματικού περιθωρίου στην Παραγωγή: ποιος είναι ο τύπος του «κάτω από το Ελάχιστο περιθώριο»;",
    [
      "Η τιμή είναι κάτω από πραγματικό κόστος × ελάχιστο πολλαπλασιαστή",
      "Άλλος τύπος",
    ],
    "Ο ίδιος μικρότερος πολλαπλασιαστής του Εύρους, όπως στο Σενάριο 1. Κλείνει στο module «Παραγωγές».",
    ["G3"],
  ),
  catalogue(
    7,
    "Σβήνει το σήμα «Υπέρβαση κόστους» αν ο admin διορθώσει τις ώρες και η συνθήκη πάψει να ισχύει;",
    [
      "Σβήνει μόνο του, το σήμα ακολουθεί τα νούμερα",
      "Μένει μόνιμο, όπως λέει η απόφαση",
    ],
    "Ακολουθεί τα νούμερα: μια διόρθωση λάθους δεν είναι υπέρβαση. Κλείνει στο module «Παραγωγές».",
    ["G3"],
  ),
  catalogue(
    9,
    "Πώς αποδίδεται η τιμή σε μια Παραγωγή (εφάπαξ, έξτρα) για το περιθώριο ανά Παραγωγή και ανά μήνα;",
    [
      "Η τιμή της Συμφωνίας ή Περιόδου συν τα έξτρα της, στον μήνα της Παραγωγής",
      "Άλλος κανόνας",
    ],
    "Τιμή Συμφωνίας/Περιόδου συν τα Τιμολογητέα έξτρα της, στον μήνα της Παραγωγής. Κλείνει στα modules «Παραγωγές» και «Οικονομικά».",
    ["G3", "I7"],
  ),
  catalogue(
    10,
    "Μερικές ώρες: αν υπάρχουν μόνο ώρες γυρίσματος και λείπει το μοντάζ, η Παραγωγή είναι «χωρίς πραγματικές ώρες»;",
    ["Ναι, και τα δύο χρειάζονται", "Όχι, μετρά με ό,τι υπάρχει"],
    "Ναι: μισές ώρες θα έδειχναν ψεύτικο περιθώριο. Κλείνει στο module «Παραγωγές».",
    ["G3"],
  ),
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
    2,
    "Χρόνος της ομάδας: δεν υπάρχει οθόνη καταγραφής χρόνου, Πραγματικές ώρες γράφει μόνο όποιος «Διαχειρίζεται κόστος». Να επιβεβαιωθεί.",
    ["G3"],
  ),
  ch8(
    3,
    "Κανάλια Μηνυμάτων: μία Συνομιλία ανά Πελάτη με Εσωτερικά Μηνύματα αντί για «δύο κανάλια ανά Παραγωγή». Να επιβεβαιωθεί.",
    ["J2"],
  ),
  ch8(
    5,
    "«Με αφορά» για Γυρίσματα στις Πωλήσεις: ποια Γυρίσματα βλέπει και κλείνει ένας πωλητής που δεν είναι Μέλος;",
    ["E1", "E3", "E4"],
  ),
  ch8(
    6,
    "Παραγωγή και Γυρίσματα: ποιος δημιουργεί Γύρισμα από την ομάδα και ποιος σημειώνει «έγινε» με τις πραγματικές ώρες;",
    ["E3", "E4"],
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
    12,
    "Κερδοφορία: πού ζει η εκτίμηση και το πραγματικό ανά Παραγωγή, Πελάτη και μήνα, στα Οικονομικά ή στις Αναφορές;",
    ["G3", "I7"],
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
