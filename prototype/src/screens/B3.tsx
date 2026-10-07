import { agreementOfOpportunity, agreementTotal } from "@/data/agreements";
import {
  LOSS_REASONS,
  STAGES,
  type Opportunity,
} from "@/data/opportunities";
import { capsOf, isForgotten, visibleOpportunities } from "@/data/sales-access";
import { findClient, memberName } from "@/data/sales";
import { PipelineBoard, type BoardCard } from "@/screens/b3-board";
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

const amountOf = (opportunity: Opportunity, canSee: boolean): string | null => {
  const agreement = agreementOfOpportunity(opportunity.id);
  if (!canSee || !agreement) return null;
  const total = fmtMoney(agreementTotal(agreement));
  return agreement.kind === "μηνιαία" ? `${total} / μήνα` : total;
};

// Pipeline Ευκαιριών: Στήλες ανά Στάδιο. Πωλήσεις: μόνο οι δικές του Ευκαιρίες (Α).
export function B3({ role, query }: ScreenProps) {
  const state = parseState(query.state);
  const caps = capsOf(role);

  const cards: readonly BoardCard[] = visibleOpportunities(role).map(
    (opportunity) => ({
      id: opportunity.id,
      href: screenHref(role, "B4", { id: opportunity.id }),
      title: opportunity.title,
      clientName: findClient(opportunity.clientId)?.name ?? "",
      owner: memberName(opportunity.ownerId),
      source: opportunity.source,
      stage: opportunity.stage,
      outcome: opportunity.outcome,
      lostReason: opportunity.lostReason,
      nextStep: opportunity.nextStep
        ? `${opportunity.nextStep.text} (${fmtDate(opportunity.nextStep.due)})`
        : null,
      isForgotten: isForgotten(opportunity),
      amount: amountOf(opportunity, caps.canSeeAmounts),
    }),
  );

  return (
    <>
      <StateSwitcher role={role} code="B3" state={state} />
      {caps.isScoped && (
        <p className="muted">
          Βλέπεις μόνο τις Ευκαιρίες των οποίων είσαι Υπεύθυνος.
        </p>
      )}
      {state === "error" && <ErrorNotice what="το Pipeline Ευκαιριών" />}
      {state === "empty" && (
        <StateNotice kind="empty" title="Δεν υπάρχουν ανοιχτές Ευκαιρίες">
          <p>
            Μια Ευκαιρία γεννιέται από τη φόρμα της Ιστοσελίδας ή όταν την
            καταχωρείς εσύ.
          </p>
        </StateNotice>
      )}
      {state === "normal" && (
        <PipelineBoard
          cards={cards}
          stages={STAGES}
          lossReasons={LOSS_REASONS}
          canManage={caps.canManage}
        />
      )}
    </>
  );
}
