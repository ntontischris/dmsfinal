// Φανταστικά δεδομένα της N5 «Ενσωματώσεις και συνδρομές» (μόνο Ιδιοκτήτης).
// Οι συνδέσεις στήνονται από τον developer χωρίς κλειδιά (ADR 0016)· ο Ιδιοκτήτης βλέπει κατάσταση και χρήση,
// ελέγχει τη σύνδεση, αλλάζει τα αναγνωριστικά μέτρησης και κρατά το μητρώο συνδρομών. Τιμές ενδεικτικές.

export type IntegrationStatus =
  "λειτουργεί" | "προσοχή" | "δεν λειτουργεί" | "δεν έχει στηθεί";

export interface IntegrationFact {
  label: string;
  value: string;
}

export interface Integration {
  id: string;
  name: string;
  purpose: string;
  status: IntegrationStatus;
  lastOk: string;
  facts: readonly IntegrationFact[];
  usage?: { label: string; used: number; limit: number; unit: string };
  // Ό,τι αλλάζει ο Ιδιοκτήτης εδώ· ό,τι άλλο, ο developer.
  ownerFields?: readonly IntegrationFact[];
  developerOnly: string;
  warning?: string;
}

export const INTEGRATIONS: readonly Integration[] = [
  {
    id: "google",
    name: "Google ημερολόγιο",
    purpose: "Το Εταιρικό ημερολόγιο, αμφίδρομα (ADR 0005)",
    status: "λειτουργεί",
    lastOk: "2026-09-20 10:38",
    facts: [
      { label: "Ημερολόγιο", value: "Delta Films · Γυρίσματα" },
      { label: "Συγχρονισμός", value: "με κάθε αλλαγή, και έλεγχος κάθε 15′" },
      { label: "Ουρά αλλαγών", value: "0 σε αναμονή" },
    ],
    developerOnly:
      "Η σύνδεση με το Google (service account χωρίς κλειδί) και το ποιο ημερολόγιο είναι το Εταιρικό.",
  },
  {
    id: "email",
    name: "Αποστολή email",
    purpose: "Κάθε email του συστήματος, από noreply@mail.deltafilms.example",
    status: "προσοχή",
    lastOk: "2026-09-20 11:02",
    facts: [
      { label: "Πλάνο", value: "Δωρεάν (100 την ημέρα, 3.000 τον μήνα)" },
      { label: "Ταυτοποίηση domain", value: "SPF, DKIM, DMARC εντάξει" },
      { label: "Απέτυχαν σήμερα", value: "0 (χθες 4, λόγω ορίου)" },
    ],
    usage: { label: "Σήμερα", used: 74, limit: 100, unit: "emails" },
    warning:
      "Πάνω από 70 την ημέρα. Χθες το όριο των 100 ξεπεράστηκε και 4 αποστολές απέτυχαν: ώρα για το επόμενο πλάνο.",
    developerOnly: "Ο πάροχος, το domain αποστολής και οι εγγραφές DNS.",
  },
  {
    id: "ai",
    name: "AI (Βοηθός και Τιμολόγια)",
    purpose: "Κάθε κλήση AI περνά από μία πύλη (ADR 0016)",
    status: "λειτουργεί",
    lastOk: "2026-09-20 10:58",
    facts: [
      { label: "Μοντέλο συζήτησης", value: "openai/gpt-4.1-mini" },
      { label: "Μοντέλο αναζήτησης", value: "openai/text-embedding-3-small" },
      { label: "Κατάταξη", value: "voyage/rerank-2.5" },
    ],
    usage: { label: "Αυτόν τον μήνα", used: 11.4, limit: 30, unit: "$" },
    developerOnly:
      "Τα μοντέλα (απόφαση ποιότητας που θέλει δοκιμή). Το πλαφόν αλλάζει στις Ρυθμίσεις › Εταιρεία › Βοηθός.",
  },
  {
    id: "turnstile",
    name: "Έλεγχος ανθρώπου",
    purpose: "Δημόσιες φόρμες, είσοδος και widget του Βοηθού",
    status: "λειτουργεί",
    lastOk: "2026-09-20 09:31",
    facts: [{ label: "Λειτουργία", value: "αθόρυβη (managed)" }],
    developerOnly: "Η σύνδεση και οι σελίδες όπου μπαίνει.",
  },
  {
    id: "analytics",
    name: "Στατιστικά και διαφήμιση",
    purpose: "Google Analytics και Meta Pixel, μόνο μετά από Αποδοχή cookies",
    status: "δεν έχει στηθεί",
    lastOk: "—",
    facts: [{ label: "Συναινέσεις (30 μέρες)", value: "62% Αποδοχή" }],
    ownerFields: [
      { label: "Google Analytics, Measurement ID", value: "G-XXXXXXXXXX" },
      { label: "Meta Pixel ID", value: "" },
    ],
    developerOnly: "Η μπάρα cookies και οι κατηγορίες της.",
  },
  {
    id: "errors",
    name: "Καταγραφή σφαλμάτων",
    purpose: "Ό,τι σπάει στο σύστημα φτάνει στον developer",
    status: "λειτουργεί",
    lastOk: "2026-09-20 11:00",
    facts: [{ label: "Σφάλματα (7 μέρες)", value: "3, όλα κλεισμένα" }],
    developerOnly: "Όλη η ρύθμιση.",
  },
];

export interface Subscription {
  id: string;
  provider: string;
  what: string;
  plan: string;
  monthly: number;
  currency: "€" | "$";
  renews: string;
  account: string;
  paidBy: string;
  link: string;
}

// Μητρώο που κρατά ο Ιδιοκτήτης. Η αλλαγή πλάνου γίνεται στον πάροχο· εδώ καταγράφεται.
export const SUBSCRIPTIONS: readonly Subscription[] = [
  {
    id: "hosting",
    provider: "Vercel",
    what: "Φιλοξενία και AI πύλη",
    plan: "Pro",
    monthly: 20,
    currency: "$",
    renews: "2026-10-01",
    account: "του developer",
    paidBy: "δεν έχει οριστεί",
    link: "https://vercel.com",
  },
  {
    id: "db",
    provider: "Supabase",
    what: "Βάση, αρχεία, είσοδος",
    plan: "Pro",
    monthly: 25,
    currency: "$",
    renews: "2026-10-03",
    account: "του developer",
    paidBy: "δεν έχει οριστεί",
    link: "https://supabase.com",
  },
  {
    id: "ai",
    provider: "Vercel AI Gateway",
    what: "Χρήση AI",
    plan: "ανά χρήση (πλαφόν $30)",
    monthly: 11.4,
    currency: "$",
    renews: "μηνιαία",
    account: "του developer",
    paidBy: "δεν έχει οριστεί",
    link: "https://vercel.com",
  },
  {
    id: "email",
    provider: "Resend",
    what: "Αποστολή email",
    plan: "Δωρεάν",
    monthly: 0,
    currency: "$",
    renews: "—",
    account: "της εταιρείας",
    paidBy: "—",
    link: "https://resend.com",
  },
  {
    id: "errors",
    provider: "Sentry",
    what: "Καταγραφή σφαλμάτων",
    plan: "Δωρεάν",
    monthly: 0,
    currency: "$",
    renews: "—",
    account: "του developer",
    paidBy: "—",
    link: "https://sentry.io",
  },
  {
    id: "domain",
    provider: "SiteGround",
    what: "Domain deltafilms.example και DNS",
    plan: "ετήσιο",
    monthly: 2,
    currency: "€",
    renews: "2027-03-15",
    account: "της εταιρείας",
    paidBy: "η εταιρεία",
    link: "https://siteground.com",
  },
];
