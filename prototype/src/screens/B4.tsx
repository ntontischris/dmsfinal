import Link from "next/link";

import { agreementQueryFor } from "@/data/agreements";
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

const MIN_MARGIN = 0.3; // Φανταστικό «Ελάχιστο περιθώριο» εταιρείας, από τις Ρυθμίσεις.

const MS_PER_DAY = 86_400_000;
const daysBetween = (fromIso: string, toIso: string): number =>
  Math.round((Date.parse(toIso) - Date.parse(fromIso)) / MS_PER_DAY);

const toProposalView = (
  proposal: NonNullable<Opportunity["proposal"]>,
  caps: SalesCaps,
): ProposalView => {
  const total = proposal.lines.reduce((sum, line) => sum + line.price, 0);
  const cost = proposal.lines.reduce(
    (sum, line) => sum + line.estimatedCost,
    0,
  );
  return {
    title: proposal.title,
    kind: proposal.kind,
    path: proposal.path,
    revision: proposal.revision,
    validUntil: fmtDate(proposal.validUntil),
    deviations: proposal.deviations,
    approval: proposal.approval?.state ?? null,
    pendingDays:
      proposal.approval?.state === "αναμένει" && proposal.approval.requestedOn
        ? daysBetween(proposal.approval.requestedOn, TODAY)
        : null,
    todayIso: TODAY,
    hasLowMargin: proposal.lowMargin,
    lines: proposal.lines.map((line) => ({
      description: line.description,
      catalog: line.catalogPrice === null ? null : fmtMoney(line.catalogPrice),
      price: fmtMoney(line.price),
    })),
    total: fmtMoney(total),
    // Κόστος και περιθώριο: μόνο όσοι «βλέπουν κόστος και κερδοφορία» (Ιδιοκτήτης, Διαχείριση).
    cost: caps.canSeeCost
      ? {
          total: fmtMoney(cost),
          margin: `${Math.round(((total - cost) / total) * 100)}%`,
          minMargin: `${Math.round(MIN_MARGIN * 100)}%`,
        }
      : null,
    recipients: proposal.recipients,
  };
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
    proposal:
      isEmpty || !opportunity.proposal
        ? null
        : toProposalView(opportunity.proposal, caps),
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
