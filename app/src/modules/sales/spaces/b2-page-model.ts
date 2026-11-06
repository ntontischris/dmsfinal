// B2 Σελίδα Πελάτη (νέα εμφάνιση), «Πέντε ενωμένες καρτέλες»: καθαρές συναρτήσεις για την κορυφή-ενημέρωση (στάδιο,
// πρόταση-σύνοψη, Επόμενο βήμα, χρήματα ως πρόταση) και για τις καρτέλες, με τις παλιές διευθύνσεις (?tab=) να πέφτουν
// στη σωστή ενωμένη καρτέλα.

import type { Step } from "@/spaces/kit/steps";
import { fmtDate, fmtMoney } from "@/spaces/screens/shared";

import type { Opportunity } from "../types";
import type { B2Ledger, B2Tab } from "./b2-adapter";

export type ClientTab =
  "overview" | "sales" | "productions" | "finance" | "comms" | "users";

// Η σειρά των καρτελών· οι «Χρήστες Πελάτη» δεν είναι στη σειρά, ανοίγουν από την πλαϊνή στήλη.
export const CLIENT_TAB_LABELS: Readonly<
  Record<Exclude<ClientTab, "users">, string>
> = {
  overview: "Επισκόπηση",
  sales: "Πωλήσεις",
  productions: "Παραγωγές",
  finance: "Οικονομικά",
  comms: "Επικοινωνία",
};

// Οι παλιές καρτέλες (και οι σύνδεσμοί τους, π.χ. τα φίλτρα του «Τι στάλθηκε») πέφτουν στη σωστή ενωμένη.
export const FROM_OLD_TAB: Readonly<Record<B2Tab, ClientTab>> = {
  details: "overview",
  opportunities: "sales",
  agreements: "sales",
  productions: "productions",
  ledger: "finance",
  chat: "comms",
  activities: "comms",
  dispatches: "comms",
  users: "users",
};

// Ποιες καρτέλες βλέπει ο Χρήστης, από τις ενότητες που δικαιούται. «users» όταν βλέπει Χρήστες Πελάτη ή GDPR.
export const clientTabsFor = (
  allowed: readonly B2Tab[],
  hasGdpr: boolean,
): ClientTab[] =>
  (
    [
      ["overview", true],
      ["sales", true],
      ["productions", allowed.includes("productions")],
      ["finance", allowed.includes("ledger")],
      [
        "comms",
        ["chat", "activities", "dispatches"].some((tab) =>
          allowed.includes(tab as B2Tab),
        ),
      ],
      ["users", allowed.includes("users") || hasGdpr],
    ] as const
  )
    .filter(([, isOn]) => isOn)
    .map(([tab]) => tab);

export const resolveClientTab = (
  value: string | undefined,
  tabs: readonly ClientTab[],
): ClientTab => {
  const mapped =
    (FROM_OLD_TAB as Readonly<Record<string, ClientTab | undefined>>)[
      value ?? ""
    ] ?? value;
  return tabs.find((tab) => tab === mapped) ?? "overview";
};

// Μόνο 3 βήματα: η «Ανανέωση» δεν γίνεται ποτέ τρέχουσα (η βάση δεν δένει ακόμα Ευκαιρία με Συμφωνία που ανανεώνει).
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

// «Σε στάδιο «Πρόταση», με 3 ανοιχτές Ευκαιρίες, χωρίς ενεργή Συμφωνία και χωρίς υπόλοιπο.»
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
  if (ledger.balance < 0)
    return `Υπόλοιπο υπέρ του Πελάτη ${fmtMoney(-ledger.balance)}.${toInvoice}`;
  const overdue =
    ledger.overdue > 0
      ? `, από τα οποία ${fmtMoney(ledger.overdue)} ληξιπρόθεσμα`
      : ", τίποτα ληξιπρόθεσμο";
  return `Χρωστά ${fmtMoney(ledger.balance)}${overdue}.${toInvoice}`;
};
