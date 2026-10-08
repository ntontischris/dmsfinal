import { Rows, type RowItem } from "@/components/ui/rows";

import { NO_MANAGER_LABEL } from "../labels";
import type { ListItem, Opportunity, SalesLists } from "../types";

import { OpportunityStatus } from "./opportunity-status";

interface ClientOpportunitiesProps {
  opportunities: readonly Opportunity[];
  lists: SalesLists;
  today: string;
  canOpen: boolean; // η σελίδα Ευκαιρίας ανοίγει μόνο σε όποιον έχει «Διαχειρίζεται Πελάτες»
}

const labelOf = (
  items: readonly ListItem[],
  id: string | null,
): string | null => items.find((item) => item.id === id)?.label ?? null;

// Αν ο Υπεύθυνος της Ευκαιρίας δεν είναι ο Υπεύθυνος του Πελάτη, η Ευκαιρία ανοίχτηκε με Αίτημα πρόσβασης.
const metaOf = (opportunity: Opportunity): string => {
  const manager = opportunity.managerName ?? NO_MANAGER_LABEL;
  return opportunity.managerId !== opportunity.clientManagerId
    ? `${manager} · με πρόσβαση`
    : manager;
};

export function ClientOpportunities({
  opportunities,
  lists,
  today,
  canOpen,
}: ClientOpportunitiesProps) {
  if (opportunities.length === 0)
    return (
      <p className="m-0 text-sm text-muted-foreground">
        Καμία Ευκαιρία για αυτόν τον Πελάτη.
      </p>
    );
  const items: RowItem[] = opportunities.map((opportunity) => ({
    id: opportunity.id,
    title: opportunity.title,
    href: canOpen ? `/app/pipeline/${opportunity.id}` : undefined,
    meta: metaOf(opportunity),
    aside: (
      <OpportunityStatus
        opportunity={opportunity}
        stageLabel={labelOf(lists.stages, opportunity.stageId) ?? "—"}
        lossReasonLabel={labelOf(lists.lossReasons, opportunity.lossReasonId)}
        today={today}
      />
    ),
  }));
  return <Rows items={items} />;
}
