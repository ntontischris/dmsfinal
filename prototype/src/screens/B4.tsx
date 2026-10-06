import Link from "next/link";

import {
  AGREEMENTS,
  agreementQueryFor,
  agreementTotal,
  costOfAgreement,
  currentRevision,
  deviationsOf,
  lineTotal,
  type AgreementRecord,
} from "@/data/agreements";
import { COST_SETTINGS } from "@/data/catalogue";
import {
  LOSS_REASONS,
  STAGES,
  findOpportunity,
  type Opportunity,
} from "@/data/opportunities";
import {
  capsOf,
  isForgotten,
  isMyOpportunity,
  type SalesCaps,
} from "@/data/sales-access";
import { TODAY, findClient, memberName } from "@/data/sales";
import type { ProposalView } from "@/screens/b4-proposal";
import {
  OpportunityWorkbench,
  type OpportunityView,
} from "@/screens/b4-workbench";
import {
  ErrorNotice,
  StateNotice,
  StateSwitcher,
  fmtDate,
  fmtMoney,
  parseState,
  screenHref,
  type ScreenProps,
} from "@/screens/shared";

// «Ελάχιστο περιθώριο» που αντιστοιχεί στον κάτω πολλαπλασιαστή τιμής (Έξοδα και Κόστος ώρας).
const MIN_MARGIN = 1 - 1 / COST_SETTINGS.multipliers.min;

const MS_PER_DAY = 86_400_000;
const daysBetween = (fromIso: string, toIso: string): number =>
  Math.round((Date.parse(toIso) - Date.parse(fromIso)) / MS_PER_DAY);

// Η πρόταση της Ευκαιρίας είναι η Συμφωνία με αυτό το opportunityId (module «3 Συμφωνίες»).
const agreementOf = (opportunityId: string): AgreementRecord | undefined =>
  AGREEMENTS.find((agreement) => agreement.opportunityId === opportunityId);

const pathOf = (agreement: AgreementRecord): ProposalView["path"] =>
  agreement.path ??
  (agreement.state === "πρόταση" ? "Σύνταξη" : "Υπογράφηκε");

const toProposalView = (
  agreement: AgreementRecord,
  caps: SalesCaps,
): ProposalView => {
  const revision = currentRevision(agreement);
  const approval = revision?.approval;
  const cost = costOfAgreement(agreement);
  return {
    title: agreement.title,
    kind: agreement.kind,
    path: pathOf(agreement),
    revision: revision?.number ?? 1,
    validUntil: agreement.validUntil ? fmtDate(agreement.validUntil) : "—",
    deviations: deviationsOf(agreement),
    approval: approval?.state ?? null,
    pendingDays:
      approval?.state === "αναμένει" && revision
        ? daysBetween(revision.when, TODAY)
        : null,
    todayIso: TODAY,
    hasLowMargin: cost.isLowMargin,
    lines: agreement.lines.map((line) => ({
      description: line.description,
      catalog:
        line.catalogPrice === null
          ? null
          : fmtMoney(line.catalogPrice * line.quantity),
      price: fmtMoney(lineTotal(line)),
    })),
    total: fmtMoney(agreementTotal(agreement)),
    // Κόστος και περιθώριο: μόνο όσοι «βλέπουν κόστος και κερδοφορία» (Ιδιοκτήτης, Διαχείριση).
    cost: caps.canSeeCost
      ? {
          total: fmtMoney(cost.estimatedCost),
          margin: `${Math.round(cost.marginPercent * 100)}%`,
          minMargin: `${Math.round(MIN_MARGIN * 100)}%`,
        }
      : null,
    recipients: agreement.recipients.map(
      ({ name, isSignatory, link, opened }) => ({
        name,
        isSignatory,
        link,
        opened,
      }),
    ),
  };
};

const proposalFor = (
  opportunityId: string,
  caps: SalesCaps,
): ProposalView | null => {
  const agreement = agreementOf(opportunityId);
  return agreement ? toProposalView(agreement, caps) : null;
};

const toView = (
  opportunity: Opportunity,
  caps: SalesCaps,
  isEmpty: boolean,
): OpportunityView => {
  const client = findClient(opportunity.clientId);
  const nextStep = isEmpty ? undefined : opportunity.nextStep;
  return {
    title: opportunity.title,
    clientName: client?.name ?? "",
    clientHref: "",
    editorHref: "",
    owner: memberName(opportunity.ownerId),
    source: opportunity.source,
    referredBy: opportunity.referredBy ?? null,
    stage: opportunity.stage,
    outcome: isEmpty ? "Ανοιχτή" : opportunity.outcome,
    lostReason: isEmpty ? null : (opportunity.lostReason ?? null),
    nextStep: nextStep
      ? {
          text: nextStep.text,
          due: fmtDate(nextStep.due),
          isOverdue: isForgotten(opportunity),
        }
      : null,
    activities: isEmpty
      ? []
      : opportunity.activities.map((activity) => ({
          ...activity,
          when: fmtDate(activity.when),
        })),
    proposal: isEmpty ? null : proposalFor(opportunity.id, caps),
  };
};

// Σελίδα Ευκαιρίας. Κόστος και περιθώριο μόνο Ιδ · Δι. Πωλήσεις: μόνο δικές του Ευκαιρίες.
export function B4({ role, query }: ScreenProps) {
  const state = parseState(query.state);
  const caps = capsOf(role);
  const opportunity = findOpportunity(query.id ?? "o-launch");

  if (!opportunity)
    return <StateNotice kind="empty" title="Δεν βρέθηκε η Ευκαιρία" />;
  if (caps.isScoped && !isMyOpportunity(opportunity)) {
    return (
      <StateNotice kind="denied" title="Χωρίς δικαίωμα">
        <p>Αυτή η Ευκαιρία δεν σε αφορά: δεν είσαι ο Υπεύθυνός της.</p>
        <Link href={screenHref(role, "B3", {})}>Πίσω στο Pipeline</Link>
      </StateNotice>
    );
  }

  const view = {
    ...toView(opportunity, caps, state === "empty"),
    clientHref: screenHref(role, "B2", { id: opportunity.clientId }),
    editorHref: screenHref(role, "D2", agreementQueryFor(opportunity.id)),
  };

  return (
    <>
      <StateSwitcher
        role={role}
        code="B4"
        state={state}
        keep={{ id: query.id }}
      />
      {state === "error" ? (
        <ErrorNotice what="η Σελίδα Ευκαιρίας" />
      ) : (
        <OpportunityWorkbench
          key={`${opportunity.id}-${state}`}
          view={view}
          stages={STAGES}
          lossReasons={LOSS_REASONS}
          canManage={caps.canManage}
          canReassign={caps.canReassign}
          canApprove={caps.canApprove}
        />
      )}
    </>
  );
}
