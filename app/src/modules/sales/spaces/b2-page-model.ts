// B2 Σελίδα Πελάτη: καθαρές συναρτήσεις για την κορυφή-ενημέρωση (στάδιο, πρόταση-σύνοψη, Επόμενο βήμα, χρήματα ως
// πρόταση) και για τα πέντε κλειστά κουτιά, με τις διευθύνσεις ?tab= να ανοίγουν το σωστό κουτί.

import type { Step } from "@/spaces/kit/steps";
import { fmtDate, fmtMoney } from "@/spaces/screens/shared";

import type { Opportunity } from "../types";
import type { B2Ledger, B2Tab } from "./b2-adapter";

// Τα πέντε κλειστά κουτιά της σελίδας, στη σειρά τους.
export type ClientBox = "summary" | "people" | "work" | "comms" | "ledger";

export const CLIENT_BOX_LABELS: Readonly<Record<ClientBox, string>> = {
  summary: "Σύνοψη",
  people: "Άνθρωποι",
  work: "Συνεργασία",
  comms: "Επικοινωνία",
  ledger: "Χρήματα",
};

// Οι διευθύνσεις ?tab= (παλιές καρτέλες, οι πέντε ενωμένες και τα ονόματα των κουτιών) ανοίγουν το σωστό κουτί.
export const BOX_OF_TAB: Readonly<Record<string, ClientBox>> = {
  details: "summary",
  overview: "summary",
  summary: "summary",
  users: "people",
  people: "people",
  opportunities: "work",
  agreements: "work",
  productions: "work",
  sales: "work",
  work: "work",
  chat: "comms",
  activities: "comms",
  dispatches: "comms",
  comms: "comms",
  ledger: "ledger",
  finance: "ledger",
};

// Ποια κουτιά βλέπει ο Χρήστης, από τις ενότητες που δικαιούται. «Άνθρωποι» όταν βλέπει Χρήστες Πελάτη ή GDPR.
export const clientBoxesFor = (
  allowed: readonly B2Tab[],
  hasGdpr: boolean,
): ClientBox[] =>
  (
    [
      ["summary", true],
      ["people", allowed.includes("users") || hasGdpr],
      ["work", true],
      [
        "comms",
        ["chat", "activities", "dispatches"].some((tab) =>
          allowed.includes(tab as B2Tab),
        ),
      ],
      ["ledger", allowed.includes("ledger")],
    ] as const
  )
    .filter(([, isOn]) => isOn)
    .map(([box]) => box);

// Το κουτί που ανοίγει από το ?tab=· κανένα όταν δεν υπάρχει ή δεν επιτρέπεται.
export const openBoxOf = (
  value: string | undefined,
  boxes: readonly ClientBox[],
): ClientBox | null => {
  const box = value === undefined ? undefined : BOX_OF_TAB[value];
  return box !== undefined && boxes.includes(box) ? box : null;
};

// Η «Ανανέωση» φαίνεται μόνο όταν ανάψει (τρέχουσα)· αλλιώς η σχέση δείχνει 3 βήματα.
export const shownSteps = (steps: readonly Step[]): Step[] =>
  steps[3]?.state === "current" ? [...steps] : steps.slice(0, 3);

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
