// B2 Σελίδα Πελάτη (νέα εμφάνιση): τα πραγματικά δεδομένα του Πελάτη στα σχήματα του prototype (`screens/B2.tsx`,
// `b2-summary.ts`, `b2-strip.ts`, `b2-inspector.tsx`). Καθαρές συναρτήσεις: ό,τι δεν φόρτωσε ή δεν δικαιούται ο Χρήστης
// έρχεται null και η αντίστοιχη γραμμή απλώς λείπει.

import type { AgreementRow } from "@/modules/agreements";
import type { Step } from "@/spaces/kit/steps";
import { hrefOf } from "@/spaces/data/screens";
import { fmtDate, fmtMoney, type BadgeTone } from "@/spaces/screens/shared";

import { OUTCOME_LABELS } from "../labels";
import { isForgotten } from "../helpers";
import type { Opportunity } from "../types";

export type B2Tab =
  | "details"
  | "users"
  | "opportunities"
  | "agreements"
  | "productions"
  | "chat"
  | "activities"
  | "dispatches"
  | "ledger";

export const B2_TABS: readonly { id: B2Tab; label: string }[] = [
  { id: "details", label: "Σύνοψη" },
  { id: "users", label: "Χρήστες πελάτη" },
  { id: "opportunities", label: "Ευκαιρίες" },
  { id: "agreements", label: "Συμφωνίες" },
  { id: "productions", label: "Παραγωγές" },
  { id: "chat", label: "Συνομιλία" },
  { id: "activities", label: "Δραστηριότητες" },
  { id: "dispatches", label: "Τι στάλθηκε" },
  { id: "ledger", label: "Καρτέλα Πελάτη" },
];

// Ποιες καρτέλες βλέπει ο Χρήστης: κάθε μία με το Δικαίωμα της οθόνης της. Με πρόσβαση μέσω δικής του Ευκαιρίας
// (Πελάτης άλλου πωλητή) μόνο Σύνοψη, Ευκαιρίες και Συμφωνίες, όπως στο prototype.
export type B2TabRights = Readonly<Record<B2Tab, boolean>>;

const GRANTED_TABS: readonly B2Tab[] = [
  "details",
  "opportunities",
  "agreements",
];

export const allowedTabs = (
  rights: B2TabRights,
  isGranted: boolean,
): readonly B2Tab[] =>
  B2_TABS.map((tab) => tab.id).filter(
    (id) => rights[id] && (!isGranted || GRANTED_TABS.includes(id)),
  );

const isOpen = (opportunity: Pick<Opportunity, "outcome">): boolean =>
  opportunity.outcome === "open";

// Σχέση με τον Πελάτη: Υποψήφιος → Πρόταση → Συμφωνία → Ανανέωση. Η «Ανανέωση» γίνεται τρέχουσα όταν η βάση λέει
// ότι μηνιαία Συμφωνία λήγει μέσα στο παράθυρο ανανέωσης ή υπάρχει ανοιχτή Ευκαιρία ανανέωσης (sales_client_renewal_due).
export const relationshipSteps = (
  opportunities: readonly Pick<Opportunity, "outcome">[],
  agreements: readonly Pick<AgreementRow, "state">[],
  isRenewalDue = false,
): Step[] => {
  const hasAgreement = agreements.some(
    (a) => a.state === "active" || a.state === "signed",
  );
  const hasProposal =
    agreements.some((a) => a.state === "proposal") ||
    opportunities.some(isOpen);
  const index = isRenewalDue ? 3 : hasAgreement ? 2 : hasProposal ? 1 : 0;
  const labels = ["Υποψήφιος", "Πρόταση", "Συμφωνία", "Ανανέωση"];
  return labels.map((label, i) => ({
    label,
    state: i < index ? "done" : i === index ? "current" : "todo",
  }));
};

export interface B2Ledger {
  balance: number;
  overdue: number;
  toInvoice: number | null;
}

export interface SummaryLine {
  label: string;
  text: string;
  tab: B2Tab;
}

export const ATTENTION_LABEL = "Χρειάζεται προσοχή";

const MS_PER_DAY = 86_400_000;

const risksLine = (
  ledger: B2Ledger | null,
  opportunities: readonly Opportunity[],
  today: string,
): SummaryLine | null => {
  const overdue =
    ledger !== null && ledger.overdue > 0
      ? [`ληξιπρόθεσμα ${fmtMoney(ledger.overdue)}`]
      : [];
  const forgotten = opportunities
    .filter((o) => isForgotten(o, today))
    .map((o) => `ξεχασμένη Ευκαιρία «${o.title}» (πέρασε το Επόμενο βήμα)`);
  const risks = [...overdue, ...forgotten];
  if (risks.length === 0) return null;
  return {
    label: ATTENTION_LABEL,
    text: risks.join(" · "),
    tab: forgotten.length > 0 ? "opportunities" : "ledger",
  };
};

// Πότε λήγει η ενεργή Συμφωνία, για να προλαβαίνεις την ανανέωση.
const agreementLine = (
  agreements: readonly AgreementRow[],
  today: string,
): SummaryLine | null => {
  const active = agreements.find(
    (a) => a.state === "active" && a.endOn !== null,
  );
  if (!active?.endOn) return null;
  const days = Math.round(
    (Date.parse(active.endOn) - Date.parse(today)) / MS_PER_DAY,
  );
  const left =
    days < 0 ? "έληξε" : days === 1 ? "σε 1 μέρα" : `σε ${days} μέρες`;
  return {
    label: "Συμφωνία",
    text: `«${active.title}» λήγει ${fmtDate(active.endOn)} (${left})`,
    tab: "agreements",
  };
};

const ATHENS_TIME = new Intl.DateTimeFormat("el-GR", {
  timeZone: "Europe/Athens",
  hour: "2-digit",
  minute: "2-digit",
  hourCycle: "h23",
});
const ATHENS_DATE = new Intl.DateTimeFormat("en-CA", {
  timeZone: "Europe/Athens",
});

const nextFilmingLine = (nextFilming: string | null): SummaryLine | null => {
  if (nextFilming === null) return null;
  const at = new Date(nextFilming);
  return {
    label: "Επόμενο γύρισμα",
    text: `${fmtDate(ATHENS_DATE.format(at))} ${ATHENS_TIME.format(at)}`,
    tab: "productions",
  };
};

export interface SummaryInput {
  agreements: readonly AgreementRow[] | null;
  ledger: B2Ledger | null;
  opportunities: readonly Opportunity[];
  nextFilming: string | null;
  today: string;
}

// Η πρώτη καρτέλα: με μια ματιά πώς πάει η σχέση. Μόνο γραμμές με πραγματική πηγή· η σελίδα κρατά όσες έχουν
// καρτέλα που βλέπει ο Χρήστης.
export const clientSummary = (input: SummaryInput): SummaryLine[] =>
  [
    risksLine(input.ledger, input.opportunities, input.today),
    input.agreements === null
      ? null
      : agreementLine(input.agreements, input.today),
    input.ledger === null
      ? null
      : {
          label: "Υπόλοιπο",
          text: fmtMoney(input.ledger.balance),
          tab: "ledger" as const,
        },
    nextFilmingLine(input.nextFilming),
  ].filter((line): line is SummaryLine => line !== null);

// Η ενεργή Συμφωνία στην πλαϊνή στήλη, με ποσό όταν η βάση το έδωσε.
export const activeAgreementText = (
  agreements: readonly AgreementRow[],
): string | null => {
  const active = agreements.find((a) => a.state === "active");
  if (!active) return null;
  const price =
    active.total === null
      ? ""
      : ` · ${fmtMoney(active.total)}${active.kind === "monthly" ? " / μήνα" : ""}`;
  return `${active.title}${price}`;
};

export const agreementTone = (
  state: AgreementRow["state"],
): BadgeTone | undefined => {
  if (state === "active" || state === "signed") return "ok";
  return state === "proposal" ? "strong" : undefined;
};

export const priceText = (
  row: Pick<AgreementRow, "total" | "kind">,
): string | null =>
  row.total === null
    ? null
    : row.kind === "monthly"
      ? `${fmtMoney(row.total)} / μήνα`
      : fmtMoney(row.total);

export interface B2OpportunityRow {
  id: string;
  title: string;
  href: string;
  sub: string;
  badge: string;
  tone: BadgeTone | undefined;
  isForgotten: boolean;
  // Η πρόταση της Ευκαιρίας: η Συμφωνία της, ή η Σελίδα Ευκαιρίας όπου ετοιμάζεται νέα.
  proposal: { href: string; label: string } | null;
}

const outcomeTone = (
  outcome: Opportunity["outcome"],
): BadgeTone | undefined => {
  if (outcome === "won") return "ok";
  return outcome === "open" ? "strong" : undefined;
};

interface OpportunityInput {
  opportunities: readonly Opportunity[];
  stageLabels: Readonly<Record<string, string>>;
  agreements: readonly Pick<AgreementRow, "id" | "opportunityId">[];
  clientManagerId: string | null;
  canPropose: boolean;
  today: string;
}

const subOf = (o: Opportunity, clientManagerId: string | null): string =>
  [
    `${o.managerName ?? "Χωρίς υπεύθυνο"}${o.managerId !== clientManagerId ? " · με πρόσβαση" : ""}`,
    isOpen(o) && o.nextStep !== "" && o.nextStepDue !== null
      ? `Επόμενο βήμα: ${o.nextStep}, ${fmtDate(o.nextStepDue)}`
      : null,
  ]
    .filter(Boolean)
    .join(" · ");

export const opportunityRows = (input: OpportunityInput): B2OpportunityRow[] =>
  input.opportunities.map((o) => {
    const agreement = input.agreements.find((a) => a.opportunityId === o.id);
    return {
      id: o.id,
      title: o.title,
      href: hrefOf("B4", { id: o.id }),
      sub: subOf(o, input.clientManagerId),
      badge: isOpen(o)
        ? (input.stageLabels[o.stageId] ?? OUTCOME_LABELS.open)
        : OUTCOME_LABELS[o.outcome],
      tone: outcomeTone(o.outcome),
      isForgotten: isForgotten(o, input.today),
      proposal:
        input.canPropose && isOpen(o)
          ? agreement
            ? { href: hrefOf("D2", { id: agreement.id }), label: "Πρόταση" }
            : { href: hrefOf("B4", { id: o.id }), label: "Νέα πρόταση" }
          : null,
    };
  });
