import { Badge, type Tone } from "@/components/ui/badge";

import type { FilmingSignals } from "../types";

// Τα σήματα μιας γραμμής: σύγκρουση, έξτρα, αίτημα ακύρωσης, «δεν μπορώ». Τόνος μόνο για όσα θέλουν προσοχή.

const SIGNAL_TONE: Record<keyof FilmingSignals, Tone | undefined> = {
  equipmentConflict: "attention",
  isExtra: "strong",
  cancelRequest: "attention",
  crewDeclined: "attention",
};

interface SignalBadgesProps {
  signals: readonly { key: keyof FilmingSignals; label: string }[];
}

export function SignalBadges({ signals }: SignalBadgesProps) {
  if (signals.length === 0)
    return <span className="text-muted-foreground">—</span>;
  return (
    <span className="flex flex-wrap gap-1">
      {signals.map((signal) => (
        <Badge key={signal.key} tone={SIGNAL_TONE[signal.key]}>
          {signal.label}
        </Badge>
      ))}
    </span>
  );
}
