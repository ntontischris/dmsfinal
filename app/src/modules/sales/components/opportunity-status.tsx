import { Badge } from "@/components/ui/badge";

import { isForgotten } from "../helpers";
import { OUTCOME_LABELS } from "../labels";
import type { Opportunity } from "../types";

interface OpportunityStatusProps {
  opportunity: Opportunity;
  stageLabel: string;
  lossReasonLabel: string | null;
  today: string;
}

// Τα σήματα μιας Ευκαιρίας. Το Στάδιο και η Έκβαση είναι ξεχωριστά: ανοιχτή δείχνει Στάδιο, κλειστή δείχνει Έκβαση.
export function OpportunityStatus({
  opportunity,
  stageLabel,
  lossReasonLabel,
  today,
}: OpportunityStatusProps) {
  if (opportunity.outcome === "won")
    return <Badge tone="ok">{OUTCOME_LABELS.won}</Badge>;
  if (opportunity.outcome === "lost") {
    const reason = lossReasonLabel ? ` · ${lossReasonLabel}` : "";
    return <Badge>{`${OUTCOME_LABELS.lost}${reason}`}</Badge>;
  }
  return (
    <span className="inline-flex flex-wrap items-center gap-1.5">
      <Badge tone="strong">{stageLabel}</Badge>
      {isForgotten(opportunity, today) && (
        <Badge tone="attention">Ξεχασμένη</Badge>
      )}
    </span>
  );
}
