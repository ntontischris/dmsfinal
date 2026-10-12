import { Panel } from "@/components/ui/panel";

import type { TodayCard } from "../view-schema";

// Όσο φορτώνει μια κάρτα: ο τίτλος της και τρεις γκρίζες γραμμές.
export function CardSkeleton({ card }: { card: TodayCard }) {
  return (
    <div aria-busy="true" aria-label={`${card.label}: φορτώνει`}>
      <Panel label={card.label}>
        <div className="grid gap-2">
          {[0, 1, 2].map((line) => (
            <span key={line} className="h-4 animate-pulse rounded-sm bg-muted" />
          ))}
        </div>
      </Panel>
    </div>
  );
}
