import type { Lang } from "@/data/website";

// Σύντομο κείμενο-τόπος (placeholder) των νομικών σελίδων. Τα γράφει ο developer, τα εγκρίνει η εταιρεία.
export type DocId = "privacy" | "cookies" | "terms" | "signing";

export interface LegalSection {
  headingEl: string;
  headingEn: string;
  textEl: string;
  textEn: string;
}

export interface LegalDoc {
  id: DocId;
  path: string;
  titleEl: string;
  titleEn: string;
  version: string;
  date: string;
  sections: readonly LegalSection[];
}

const s = (
  headingEl: string,
  textEl: string,
  headingEn: string,
  textEn: string,
): LegalSection => ({ headingEl, textEl, headingEn, textEn });

export const LEGAL_DOCS: readonly LegalDoc[] = [
  {
    id: "privacy",
    path: "/privacy",
    titleEl: "Πολιτική απορρήτου",
    titleEn: "Privacy policy",
    version: "1.0",
    date: "2026-09-01",
    sections: [
      s(
        "Ποιοι είμαστε",
        "Υπεύθυνη επεξεργασίας είναι η Δέλτα Παραγωγές Ι.Κ.Ε. (Delta Films).",
        "Who we are",
        "The controller is Δέλτα Παραγωγές Ι.Κ.Ε. (Delta Films).",
      ),
      s(
        "Τι δεδομένα συλλέγουμε",
        "Όσα μας δίνετε στη φόρμα, στις συζητήσεις με τον Βοηθό και κατά τη συνεργασία μας.",
        "What we collect",
        "What you give us in the form, in Assistant chats and while we work together.",
      ),
      s(
        "Γιατί και πόσο τα κρατάμε",
        "Για να σας απαντήσουμε και να εκτελέσουμε τη συνεργασία. Οι συζητήσεις με τον Βοηθό σβήνουν 12 μήνες μετά το τελευταίο μήνυμα.",
        "Why and how long",
        "To reply to you and carry out our work. Assistant chats are deleted 12 months after the last message.",
      ),
      s(
        "Πού μένουν",
        "Η βάση και τα αρχεία μένουν στην ΕΕ. Για υποεκτελούντες στις ΗΠΑ ισχύουν DPA και SCCs.",
        "Where it is kept",
        "The database and files stay in the EU. Processors in the US are covered by DPAs and SCCs.",
      ),
      s(
        "Τα δικαιώματά σας",
        "Πρόσβαση, διόρθωση, διαγραφή, εναντίωση. Γράψτε μας στο email της εταιρείας.",
        "Your rights",
        "Access, correction, deletion, objection. Write to the company email.",
      ),
    ],
  },
  {
    id: "cookies",
    path: "/cookies",
    titleEl: "Πολιτική cookies",
    titleEn: "Cookie policy",
    version: "1.0",
    date: "2026-09-01",
    sections: [
      s(
        "Τι είναι τα cookies",
        "Μικρά αρχεία που αποθηκεύει ο browser σας.",
        "What cookies are",
        "Small files your browser stores.",
      ),
      s(
        "Πότε φορτώνουν",
        "Στατιστικά και Marketing φορτώνουν μόνο μετά την Αποδοχή σας.",
        "When they load",
        "Statistics and Marketing load only after you accept.",
      ),
      s(
        "Πώς αλλάζετε γνώμη",
        "Από τον σύνδεσμο «Ρυθμίσεις cookies» στο υποσέλιδο, οποτεδήποτε.",
        "Changing your mind",
        "Use the “Cookie settings” link in the footer, any time.",
      ),
    ],
  },
  {
    id: "terms",
    path: "/terms",
    titleEl: "Όροι χρήσης",
    titleEn: "Terms of use",
    version: "1.0",
    date: "2026-09-01",
    sections: [
      s(
        "Η Ιστοσελίδα",
        "Η Ιστοσελίδα παρουσιάζει τις υπηρεσίες της εταιρείας και δεν αποτελεί δεσμευτική προσφορά.",
        "The website",
        "The website presents the company's services and is not a binding offer.",
      ),
      s(
        "Ο λογαριασμός σας",
        "Η είσοδος γίνεται μόνο με πρόσκληση. Φυλάξτε τα στοιχεία εισόδου σας.",
        "Your account",
        "Sign-in is by invitation only. Keep your credentials safe.",
      ),
      s(
        "Περιεχόμενο",
        "Τα βίντεο και τα κείμενα ανήκουν στην εταιρεία ή στους πελάτες της.",
        "Content",
        "Videos and texts belong to the company or its clients.",
      ),
    ],
  },
  {
    id: "signing",
    path: "/signing-terms",
    titleEl: "Όροι ηλεκτρονικής υπογραφής",
    titleEn: "Electronic signing terms",
    version: "1.0",
    date: "2026-09-01",
    sections: [
      s(
        "Τι υπογράφετε",
        "Αποδέχεστε μια Πρόταση με κωδικό που στέλνουμε στο email σας.",
        "What you sign",
        "You accept a Proposal with a code we email to you.",
      ),
      s(
        "Τι καταγράφεται",
        "Ημερομηνία, ώρα, όνομα και η έκδοση του κειμένου που αποδεχθήκατε.",
        "What is recorded",
        "Date, time, name and the version of the text you accepted.",
      ),
      s(
        "Μετά την υπογραφή",
        "Λαμβάνετε αντίγραφο και πρόσκληση στον λογαριασμό σας.",
        "After signing",
        "You receive a copy and an invitation to your account.",
      ),
    ],
  },
];

export const parseDoc = (value: string | undefined): DocId =>
  LEGAL_DOCS.find((d) => d.id === value)?.id ?? "privacy";

export const docTitle = (d: LegalDoc, lang: Lang): string =>
  lang === "en" ? d.titleEn : d.titleEl;

export interface Subprocessor {
  name: string;
  roleEl: string;
  roleEn: string;
  where: string;
}

export const SUBPROCESSORS: readonly Subprocessor[] = [
  {
    name: "Vercel (και AI Gateway)",
    roleEl: "Φιλοξενία της Ιστοσελίδας και δρομολόγηση του Βοηθού",
    roleEn: "Website hosting and Assistant routing",
    where: "ΕΕ / ΗΠΑ · DPA, SCCs",
  },
  {
    name: "Supabase",
    roleEl: "Βάση δεδομένων και αρχεία",
    roleEn: "Database and files",
    where: "ΕΕ (eu-west-1)",
  },
  {
    name: "OpenAI",
    roleEl: "Απαντήσεις του Βοηθού",
    roleEn: "Assistant answers",
    where: "ΗΠΑ · DPA, SCCs",
  },
  {
    name: "Voyage",
    roleEl: "Αναζήτηση στη Γνώση του Βοηθού",
    roleEn: "Assistant knowledge search",
    where: "ΗΠΑ · DPA, SCCs",
  },
  {
    name: "Resend",
    roleEl: "Αποστολή email",
    roleEn: "Sending email",
    where: "ΗΠΑ · DPA, SCCs",
  },
  {
    name: "Google",
    roleEl: "Ημερολόγιο, είσοδος με Google, στατιστικά (μόνο με Αποδοχή)",
    roleEn: "Calendar, Google sign-in, statistics (only if accepted)",
    where: "ΗΠΑ · DPA, SCCs",
  },
  {
    name: "Cloudflare",
    roleEl: "Έλεγχος ότι είστε άνθρωπος (Turnstile)",
    roleEn: "Human check (Turnstile)",
    where: "ΗΠΑ · DPA, SCCs",
  },
  {
    name: "Meta",
    roleEl: "Μέτρηση διαφημίσεων (μόνο με Αποδοχή Marketing)",
    roleEn: "Ad measurement (only if you accept Marketing)",
    where: "ΗΠΑ · DPA, SCCs",
  },
];

export const COOKIE_TOOLS: Readonly<
  Record<string, { toolsEl: string; toolsEn: string; keeps: string }>
> = {
  necessary: {
    toolsEl: "Συνεδρία εισόδου, έλεγχος ανθρώπου, η επιλογή σας για cookies",
    toolsEn: "Sign-in session, human check, your cookie choice",
    keeps: "συνεδρία · 12 μήνες",
  },
  statistics: {
    toolsEl: "Google Analytics (GA4)",
    toolsEn: "Google Analytics (GA4)",
    keeps: "14 μήνες",
  },
  marketing: {
    toolsEl: "Meta Pixel",
    toolsEn: "Meta Pixel",
    keeps: "90 ημέρες",
  },
};
