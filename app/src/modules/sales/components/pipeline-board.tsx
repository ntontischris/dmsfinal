import Link from "next/link";

import { Panel } from "@/components/ui/panel";

import type { BoardColumn, ListItem, Opportunity, SalesLists } from "../types";

import { BoardCard } from "./board-card";
import { OpportunityStatus } from "./opportunity-status";

interface PipelineBoardProps {
  columns: readonly BoardColumn[];
  closed: readonly Opportunity[];
  lists: SalesLists;
  today: string;
  // Ποιος μπορεί να δουλέψει την Ευκαιρία (κάθε κάρτα έχει δικό της Υπεύθυνο)· η βάση αποφασίζει ξανά στην εγγραφή.
  canWork: (opportunity: Opportunity) => boolean;
}

const labelOf = (items: readonly ListItem[], id: string | null): string =>
  items.find((item) => item.id === id)?.label ?? "—";

function ClosedCard({
  opportunity,
  lists,
  today,
}: {
  opportunity: Opportunity;
  lists: SalesLists;
  today: string;
}) {
  return (
    <li className="grid gap-2 rounded-sm border bg-background p-3 text-sm">
      <Link
        href={`/app/pipeline/${opportunity.id}`}
        className="font-medium break-words"
      >
        {opportunity.title}
      </Link>
      <span className="break-words">{opportunity.clientName ?? "—"}</span>
      <div>
        <OpportunityStatus
          opportunity={opportunity}
          stageLabel={labelOf(lists.stages, opportunity.stageId)}
          lossReasonLabel={
            opportunity.lossReasonId
              ? labelOf(lists.lossReasons, opportunity.lossReasonId)
              : null
          }
          today={today}
        />
      </div>
    </li>
  );
}

function StageColumn({
  column: { stage, cards },
  lists,
  today,
  canWork,
}: {
  column: BoardColumn;
  lists: SalesLists;
  today: string;
  canWork: PipelineBoardProps["canWork"];
}) {
  const activeStages = lists.stages.filter((item) => !item.isRetired);
  return (
    <Panel label={stage.label} aside={String(cards.length)}>
      {cards.length === 0 ? (
        <p className="m-0 text-sm text-muted-foreground">Καμία Ευκαιρία.</p>
      ) : (
        <ul className="m-0 grid list-none gap-3 p-0">
          {cards.map((card) => (
            <BoardCard
              key={card.id}
              opportunity={card}
              stages={activeStages}
              reasons={lists.lossReasons}
              sourceLabel={labelOf(lists.sources, card.sourceId)}
              today={today}
              canWork={canWork(card)}
            />
          ))}
        </ul>
      )}
    </Panel>
  );
}

function ClosedPanel({
  closed,
  lists,
  today,
}: {
  closed: readonly Opportunity[];
  lists: SalesLists;
  today: string;
}) {
  return (
    <Panel label="Κλεισμένες">
      <ul className="m-0 grid list-none gap-3 p-0 sm:grid-cols-2">
        {closed.map((opportunity) => (
          <ClosedCard
            key={opportunity.id}
            opportunity={opportunity}
            lists={lists}
            today={today}
          />
        ))}
      </ul>
    </Panel>
  );
}

// B3: μία στήλη ανά ενεργό Στάδιο, από κάτω οι πρόσφατα κλεισμένες. Το Στάδιο και η Έκβαση είναι ξεχωριστά πράγματα.
export function PipelineBoard({
  columns,
  closed,
  lists,
  today,
  canWork,
}: PipelineBoardProps) {
  return (
    <div className="grid gap-4">
      <div className="grid items-start gap-3 sm:grid-cols-2 lg:grid-cols-[repeat(auto-fit,minmax(16rem,1fr))]">
        {columns.map((column) => (
          <StageColumn
            key={column.stage.id}
            column={column}
            lists={lists}
            today={today}
            canWork={canWork}
          />
        ))}
      </div>
      {closed.length > 0 && (
        <ClosedPanel closed={closed} lists={lists} today={today} />
      )}
      <p className="m-0 text-sm text-muted-foreground">
        Κερδισμένη δεν μπαίνει με το χέρι: γίνεται μόνη της όταν υπογράψει ο
        Υπογράφων. Το Στάδιο και η Έκβαση είναι ξεχωριστά.
      </p>
    </div>
  );
}
