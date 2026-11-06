// PROTOTYPE — throwaway, three variants of the Client page via ?variant=.
// Καθαρές συναρτήσεις για τις τρεις παραλλαγές: η πρόταση-σύνοψη, το Επόμενο βήμα, τα χρήματα ως πρόταση,
// και τα κείμενα του διακόπτη («Τι σκέφτεται;»).

import type { Step } from "@/spaces/kit/steps";
import { fmtDate, fmtMoney } from "@/spaces/screens/shared";

import type { Opportunity } from "../types";
import type { B2Ledger } from "./b2-adapter";

export type ProtoVariant = "a" | "b" | "c";
export const PROTO_ORDER: readonly (ProtoVariant | null)[] = [
  null,
  "a",
  "b",
  "c",
];

// Στην παραγωγή το ?variant= αγνοείται: η σελίδα μένει όπως είναι.
export const isProtoEnabled = (): boolean =>
  process.env.VERCEL_ENV !== "production";

export const parseVariant = (value: string | undefined): ProtoVariant | null =>
  value === "a" || value === "b" || value === "c" ? value : null;

export interface VariantInfo {
  label: string;
  thinks: string;
  changes: readonly string[];
}

export const NOW_LABEL = "Τώρα — όπως είναι";

export const VARIANTS: Readonly<Record<ProtoVariant, VariantInfo>> = {
  a: {
    label: "Α — Πέντε ενωμένες καρτέλες",
    thinks:
      "Η σελίδα λέει τα ίδια πράγματα δύο και τρεις φορές και έχει 9 καρτέλες, από τις οποίες δύο είναι μόνο σύνδεσμοι. Οι καρτέλες πρέπει να μαζεύονται ανά δουλειά, όχι ανά πίνακα της βάσης.",
    changes: [
      "9 καρτέλες γίνονται 5: Επισκόπηση, Πωλήσεις, Παραγωγές, Οικονομικά, Επικοινωνία",
      "Οι μεγάλες κάρτες «0 / 0 € / 3» φεύγουν· τα νούμερα σε μικρό «Σε αριθμούς» στο πλάι",
      "Η Καρτέλα Πελάτη φαίνεται μέσα στη σελίδα, όχι ως σύνδεσμος",
      "Συνομιλία, Δραστηριότητες και Τι στάλθηκε μαζί στην «Επικοινωνία»",
      "Μεταβίβαση, Ιστορικό και Διαγραφή στο «⋯»",
      "Το βηματόμετρο χωρίς «Ανανέωση», μία μόνο ετικέτα σταδίου",
    ],
  },
  b: {
    label: "Β — Πρώτα το τηλεφώνημα",
    thinks:
      "Ο Ιδιοκτήτης ανοίγει τη σελίδα ~20 φορές τη μέρα: πριν από ένα τηλέφωνο, μετά από μια συνάντηση, όταν κυνηγά χρήματα. Πρέπει να απαντά σε 3 δευτερόλεπτα «τι έγινε τελευταία, τι ακολουθεί» και να γράφεις χωρίς να φεύγεις.",
    changes: [
      "Μεγάλα «Κλήση» και «Email» στην κορυφή της πλαϊνής στήλης",
      "Νέο μπλοκ «Τώρα»: τελευταία Δραστηριότητα, Επόμενο βήμα, τι χρειάζεται προσοχή",
      "Η «Καταγραφή» και οι 3 τελευταίες γραμμές πάντα ορατές, χωρίς καρτέλα",
      "Τα χρήματα ονομάζουν τα ληξιπρόθεσμα Τιμολόγια αντί για «0 €»",
      "5 καρτέλες + «Περισσότερα ▾» για Χρήστες, Τι στάλθηκε, Καρτέλα, Συνομιλία",
      "Οι μεγάλες κάρτες με τα νούμερα φεύγουν",
    ],
  },
  c: {
    label: "Γ — Ενημέρωση σαν το Σήμερα",
    thinks:
      "Ό,τι ενέκρινε ήδη ο Ιδιοκτήτης στη «Σήμερα» πρέπει να ξαναχρησιμοποιηθεί: η σελίδα διαβάζεται από πάνω προς τα κάτω σαν ενημέρωση από πάνελ με τίτλο. Η σύνοψη ΕΙΝΑΙ η ενημέρωση, δεν χρειάζεται καρτέλα «Σύνοψη».",
    changes: [
      "Καμία πλαϊνή στήλη: μία στήλη με πάνελ όπως στη «Σήμερα»",
      "Ζεύγη πάνελ: Χρειάζεται προσοχή | Επόμενο βήμα, Σχέση | Χρήματα",
      "Το «Επόμενο γύρισμα» με κίτρινη γραμμή, μόνο αυτό",
      "Επικοινωνία σε μία γραμμή, «Αλλαγή στοιχείων» ως κείμενο",
      "Η «Σύνοψη» χάνεται· όλες οι άλλες ενότητες σε μία οριζόντια σειρά καρτελών",
      "Οι άδειες ενότητες δείχνουν μία ήσυχη γραμμή",
    ],
  },
};

// Ο σύνδεσμος μιας καρτέλας της παραλλαγής: κρατά το ?variant=.
export const protoTabHref = (
  clientId: string,
  variant: ProtoVariant,
  tab: string,
): string =>
  `/app/clients/${encodeURIComponent(clientId)}?${new URLSearchParams({ variant, tab }).toString()}`;

// Μόνο 3 βήματα: η «Ανανέωση» δεν γίνεται ποτέ τρέχουσα.
export const threeSteps = (steps: readonly Step[]): Step[] => steps.slice(0, 3);

export const stageOf = (steps: readonly Step[]): string =>
  steps.find((step) => step.state === "current")?.label ?? "Υποψήφιος";

const countText = (n: number): string =>
  n === 0
    ? "χωρίς ανοιχτή Ευκαιρία"
    : n === 1
      ? "με 1 ανοιχτή Ευκαιρία"
      : `με ${n} ανοιχτές Ευκαιρίες`;

export interface LeadInput {
  stage: string;
  openCount: number;
  // undefined = ο Χρήστης δεν βλέπει Συμφωνίες· null = καμία ενεργή.
  activeAgreement: string | null | undefined;
  ledger: B2Ledger | null;
}

// «Σε στάδιο Πρότασης, με 3 ανοιχτές Ευκαιρίες, χωρίς ενεργή Συμφωνία και χωρίς υπόλοιπο.»
export const leadSentence = (input: LeadInput): string => {
  const parts = [
    `Σε στάδιο «${input.stage}»`,
    countText(input.openCount),
    input.activeAgreement === undefined
      ? null
      : input.activeAgreement === null
        ? "χωρίς ενεργή Συμφωνία"
        : `με ενεργή Συμφωνία «${input.activeAgreement}»`,
    input.ledger === null
      ? null
      : input.ledger.balance === 0
        ? "χωρίς υπόλοιπο"
        : `με υπόλοιπο ${fmtMoney(input.ledger.balance)}`,
  ].filter((part): part is string => part !== null);
  const last = parts.pop();
  return parts.length === 0 ? `${last}.` : `${parts.join(", ")} και ${last}.`;
};

export interface NextStep {
  opportunityId: string;
  step: string;
  due: string;
  title: string;
  owner: string;
  isLate: boolean;
}

// Η ανοιχτή Ευκαιρία με το πιο κοντινό Επόμενο βήμα.
export const nextStepOf = (
  opportunities: readonly Opportunity[],
  today: string,
): NextStep | null => {
  const next = opportunities
    .filter((o) => o.outcome === "open" && o.nextStepDue !== null)
    .sort((x, y) =>
      (x.nextStepDue ?? "").localeCompare(y.nextStepDue ?? ""),
    )[0];
  if (!next?.nextStepDue) return null;
  return {
    opportunityId: next.id,
    step: next.nextStep === "" ? "Χωρίς περιγραφή" : next.nextStep,
    due: fmtDate(next.nextStepDue),
    title: next.title,
    owner: next.managerName ?? "Χωρίς υπεύθυνο",
    isLate: next.nextStepDue < today,
  };
};

// Τα χρήματα ως πρόταση, ποτέ ένα σκέτο «0 €».
export const moneySentence = (
  ledger: (B2Ledger & { hasEntries: boolean }) | null,
): string | null => {
  if (ledger === null) return null;
  if (!ledger.hasEntries) return "Καμία κίνηση στην Καρτέλα Πελάτη ακόμα.";
  const toInvoice =
    ledger.toInvoice === null || ledger.toInvoice === 0
      ? ""
      : ` Περιμένουν τιμολόγηση ${fmtMoney(ledger.toInvoice)}.`;
  if (ledger.balance === 0) return `Δεν χρωστά τίποτα.${toInvoice}`;
  const overdue =
    ledger.overdue > 0
      ? `, από τα οποία ${fmtMoney(ledger.overdue)} ληξιπρόθεσμα`
      : ", τίποτα ληξιπρόθεσμο";
  return `Χρωστά ${fmtMoney(ledger.balance)}${overdue}.${toInvoice}`;
};
