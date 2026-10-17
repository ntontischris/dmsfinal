import { AI, formatUsd, redNote } from "../labels";
import type { HealthView } from "../schemas";
import { aiShare, sectionVerdict } from "../status";
import { HealthCard } from "./health-card";

// Η δαπάνη AI του μήνα απέναντι στο πλαφόν, μόνο για ανάγνωση (Γεγονός 57). Το πλαφόν το αλλάζει μόνο ο Ιδιοκτήτης.
export function AiCard({
  ai,
  isOwner,
}: {
  ai: HealthView["ai"];
  isOwner: boolean;
}) {
  const percent = Math.round(aiShare(ai) * 100);
  return (
    <HealthCard title={AI.title} verdict={sectionVerdict(ai.alert)}>
      {ai.capMicros <= 0 ? (
        <p className="m-0 text-sm">{AI.closed}</p>
      ) : (
        <>
          <p className="m-0 text-sm tabular-nums">
            {formatUsd(ai.spentMicros)} από {formatUsd(ai.capMicros)} αυτόν τον
            μήνα ({percent}%).
          </p>
          <div
            role="meter"
            aria-label={AI.title}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={percent}
            className="h-1.5 overflow-hidden rounded-full bg-muted"
          >
            <span
              className={
                ai.alert
                  ? "block h-full bg-destructive"
                  : "block h-full bg-primary"
              }
              style={{ width: `${percent}%` }}
            />
          </div>
        </>
      )}
      <p className="m-0 text-sm text-muted-foreground">
        {AI.rule(ai.publicShare)}
      </p>
      {ai.alert && (
        <p className="m-0 text-sm text-muted-foreground">{redNote(57)}</p>
      )}
      <p className="m-0 text-sm">
        {isOwner ? AI.changeOwner : AI.changeOthers}
      </p>
    </HealthCard>
  );
}
