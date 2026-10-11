import { Badge } from "@/components/ui/badge";

import { signalsOf } from "../helpers";
import type { DeliverableCard } from "../types";

// Τα σήματα ενός Παραδοτέου ως σήματα (καθυστερεί, πάνω από το όριο, σπασμένο link).
export function SignalBadges({ card }: { card: DeliverableCard }) {
  const signals = signalsOf(card);
  if (signals.length === 0) return null;
  return (
    <span className="flex flex-wrap gap-1">
      {signals.map((signal) => (
        <Badge key={signal.label} tone={signal.tone}>
          {signal.label}
        </Badge>
      ))}
    </span>
  );
}
