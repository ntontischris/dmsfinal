// B3 Pipeline (νέα εμφάνιση): οι πραγματικές Ευκαιρίες στις κάρτες του prototype (`screens/B3.tsx`). Καθαρή συνάρτηση.

import type { AgreementRow } from "@/modules/agreements";
import { hrefOf } from "@/spaces/data/screens";
import { fmtDate, fmtMoney } from "@/spaces/screens/shared";

import { isForgotten } from "../helpers";
import { NO_MANAGER_LABEL } from "../labels";
import type { Opportunity, Outcome } from "../types";
import { daysSince } from "./b3-filters";

export interface BoardCard {
  id: string;
  href: string;
  title: string;
  clientName: string;
  owner: string;
  source: string;
  stageId: string;
  outcome: Outcome;
  lostReason: string | null;
  nextStep: string | null;
  isForgotten: boolean;
  // «πριν από Χ μέρες»: πότε έπρεπε να γίνει το Επόμενο βήμα.
  overdue: string | null;
  amount: string | null;
  nextStepDue: string | null;
  // Η πιο πρόσφατη Δραστηριότητα στις Ευκαιρίες του Πελάτη (ISO), ή null.
  lastContact: string | null;
  // Ο Υπεύθυνος της Ευκαιρίας ή όποιος διαχειρίζεται όλους τους Πελάτες: μετακινεί και κλείνει.
  canWork: boolean;
}

export const daysAgoText = (fromIso: string, todayIso: string): string => {
  const days = daysSince(fromIso, todayIso);
  if (days <= 0) return "σήμερα";
  if (days === 1) return "χθες";
  return `πριν από ${days} μέρες`;
};

const amountOf = (
  agreement: Pick<AgreementRow, "total" | "kind"> | undefined,
): string | null => {
  if (!agreement || agreement.total === null) return null;
  const total = fmtMoney(agreement.total);
  return agreement.kind === "monthly" ? `${total} / μήνα` : total;
};

export interface BoardInput {
  opportunities: readonly Opportunity[];
  sourceLabels: Readonly<Record<string, string>>;
  lossLabels: Readonly<Record<string, string>>;
  // Η Συμφωνία κάθε Ευκαιρίας (από το opportunityId)· κενό όταν ο Χρήστης δεν βλέπει Συμφωνίες.
  agreements: readonly Pick<AgreementRow, "opportunityId" | "total" | "kind">[];
  lastContacts: Readonly<Record<string, string | null>>;
  canWork: (opportunity: Opportunity) => boolean;
  today: string;
}

export const boardCardsOf = (input: BoardInput): BoardCard[] =>
  input.opportunities.map((o) => {
    const forgotten = isForgotten(o, input.today);
    return {
      id: o.id,
      href: hrefOf("B4", { id: o.id }),
      title: o.title,
      clientName: o.clientName ?? "",
      owner: o.managerName ?? NO_MANAGER_LABEL,
      source: input.sourceLabels[o.sourceId] ?? "",
      stageId: o.stageId,
      outcome: o.outcome,
      lostReason: o.lossReasonId
        ? (input.lossLabels[o.lossReasonId] ?? null)
        : null,
      nextStep:
        o.nextStep !== "" && o.nextStepDue !== null
          ? `${o.nextStep} (${fmtDate(o.nextStepDue)})`
          : null,
      isForgotten: forgotten,
      overdue:
        forgotten && o.nextStepDue
          ? daysAgoText(o.nextStepDue, input.today)
          : null,
      amount: amountOf(input.agreements.find((a) => a.opportunityId === o.id)),
      nextStepDue: o.outcome === "open" ? o.nextStepDue : null,
      lastContact: input.lastContacts[o.clientId] ?? null,
      canWork: o.outcome === "open" && input.canWork(o),
    };
  });
