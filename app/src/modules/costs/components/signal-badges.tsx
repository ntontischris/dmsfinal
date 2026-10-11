import { Badge } from "@/components/ui/badge";

import { NO_VALUE_LABEL } from "../labels";
import { signalLabels } from "../helpers";
import type { CostSignals } from "../types";

// Τα σήματα είναι ενδείξεις, όχι φραγμοί: φαίνονται ως ετικέτες, και τίποτα άλλο δεν κλειδώνει.
export function SignalBadges({ signals }: { signals: CostSignals }) {
  const labels = signalLabels(signals);
  if (labels.length === 0) return <span className="text-muted-foreground">{NO_VALUE_LABEL}</span>;
  return (
    <span className="flex flex-wrap gap-1.5">
      {labels.map((label) => (
        <Badge key={label} tone="attention">
          {label}
        </Badge>
      ))}
    </span>
  );
}
