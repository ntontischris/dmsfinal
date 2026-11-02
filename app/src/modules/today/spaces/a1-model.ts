// A1 «Σήμερα» (νέα εμφάνιση): τύποι και βοηθητικά, από το prototype (`screens/a1-model.ts`).
// Στην εφαρμογή οι κάρτες έρχονται από το μητρώο της βάσης (today_cards): ποιες φαίνονται και με ποια σειρά το
// αποφασίζουν τα Δικαιώματα και οι Προτιμήσεις του Χρήστη· εδώ μόνο το σχήμα που ζωγραφίζει η οθόνη.

export type CardKind = "action" | "info" | "status";

export interface CardRow {
  label: string;
  meta?: string;
  href: string;
  isUrgent?: boolean;
}

export interface CardContent {
  count: number;
  summary?: string;
  rows: readonly CardRow[];
  allHref: string;
  emptyText: string;
  cta?: { label: string; href: string };
  // Όταν η δική μου λίστα είναι άδεια: τι έχει καθυστερήσει στους άλλους της ομάδας.
  teamRows?: readonly CardRow[];
  // Η κάρτα δείχνει ένα ποσό, όχι πλήθος: χωρίς αριθμό στη γωνία.
  isCountless?: boolean;
}

export interface CardDef {
  id: string;
  title: string;
  // Η οθόνη-ουρά της κάρτας: εκεί οδηγεί το «Όλα →».
  source: string;
  // action: κάτι περιμένει εμένα· κρύβεται όταν είναι άδεια.
  // info: η εβδομάδα μου· μένει και άδεια, με μία γραμμή.
  // status: η Υγεία· μένει πάντα, πράσινη ή κόκκινη.
  kind: CardKind;
  // Ζητά κάτι από πελάτη: μετρά για το Τώρα, αλλά χωρίς κόκκινο και χωρίς «επείγον».
  isGentle?: boolean;
  // Τεχνική κάρτα (Υγεία, Google): όταν δεν έχει πρόβλημα, μπαίνει στο «Περισσότερα».
  isTechnical?: boolean;
}

export const ROWS_SHOWN = 3;

// Ενικός ή πληθυντικός μαζί με τον αριθμό: «1 Πελάτη», «3 Πελάτες».
export const countWord = (n: number, one: string, many: string): string =>
  `${n} ${n === 1 ? one : many}`;

// Η κλητική του μικρού ονόματος για τον χαιρετισμό: «Καλημέρα, Δημήτρη».
// Αρκεί για τα ονόματα σε -ος, -ης, -ας (Γιώργο, Δημήτρη, Κώστα)· τα θηλυκά μένουν ίδια.
export const vocativeOf = (name: string): string =>
  /(ος|ης|ας)$/.test(name) ? name.slice(0, -1) : name;

// Ο χαιρετισμός με την ώρα της στιγμής (ΗΗ:ΛΛ στο τέλος): ως τις 12:59 «Καλημέρα», μετά «Καλησπέρα».
export const greetingAt = (stamp: string): string => {
  const hour = Number(stamp.slice(11, 13));
  return hour >= 5 && hour < 13 ? "Καλημέρα" : "Καλησπέρα";
};
