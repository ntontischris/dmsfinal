import Link from "next/link";

import { Badge, type Tone } from "@/components/ui/badge";

import { deadlineText, isInternalCard } from "../helpers";
import { CANCEL_OUTCOME_LABELS, CHARGE_LABELS, NO_ASSIGNEE_LABEL, NO_DEADLINE_LABEL, NO_FILMING_LABEL, INTERNAL_LABEL, STATE_LABELS } from "../labels";
import type { DeliverableCard, DeliverableState } from "../types";

import { SignalBadges } from "./signal-badges";

const stateTone = (state: DeliverableState): Tone | undefined => {
  if (state === "approved") return "ok";
  if (state === "changes_requested") return "attention";
  return undefined;
};

// Η κεφαλίδα της σελίδας Παραδοτέου: τίτλος, κατάσταση, σήματα και τα στοιχεία του.
export function DeliverableHeader({ card }: { card: DeliverableCard }) {
  return (
    <header className="grid gap-3">
      <h1 className="m-0 text-2xl font-semibold">{card.title}</h1>
      <div className="flex flex-wrap items-center gap-2">
        <Badge tone={stateTone(card.state)}>{STATE_LABELS[card.state]}</Badge>
        <SignalBadges card={card} />
        {isInternalCard(card) && <Badge>{INTERNAL_LABEL}</Badge>}
      </div>
      <dl className="m-0 grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 text-sm">
        <dt className="text-muted-foreground">Παραγωγή</dt>
        <dd className="m-0">
          <Link href={`/app/productions/${card.productionId}`}>{card.production}</Link>
          {card.client && <span className="text-muted-foreground"> · {card.client}</span>}
        </dd>
        <dt className="text-muted-foreground">Είδος</dt>
        <dd className="m-0">{card.kind}</dd>
        <dt className="text-muted-foreground">Υπεύθυνος</dt>
        <dd className="m-0">{card.assigneeName ?? NO_ASSIGNEE_LABEL}</dd>
        <dt className="text-muted-foreground">Προθεσμία</dt>
        <dd className="m-0">{deadlineText(card.deadline) || NO_DEADLINE_LABEL}</dd>
        <dt className="text-muted-foreground">Γύρισμα</dt>
        <dd className="m-0">
          {card.filmingId ? (
            <Link href={`/app/filming/${card.filmingId}`}>Δες το Γύρισμα</Link>
          ) : (
            NO_FILMING_LABEL
          )}
        </dd>
        <dt className="text-muted-foreground">Γύροι αλλαγών</dt>
        <dd className="m-0">
          {card.roundsUsed} από {card.roundsLimit ?? "—"}
        </dd>
        <dt className="text-muted-foreground">Χρέωση</dt>
        <dd className="m-0">{chargeText(card)}</dd>
      </dl>
    </header>
  );
}

function chargeText(card: DeliverableCard): string {
  const base = CHARGE_LABELS[card.charge];
  const reason = card.chargeReason ? `: ${card.chargeReason}` : "";
  const cancel = card.cancelOutcome ? ` · ${CANCEL_OUTCOME_LABELS[card.cancelOutcome]}` : "";
  return `${base}${reason}${cancel}`;
}
