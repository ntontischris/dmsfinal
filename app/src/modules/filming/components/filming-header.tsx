import { Badge } from "@/components/ui/badge";
import { Panel } from "@/components/ui/panel";

import { NO_CLIENT_LABEL, STATE_LABELS } from "../labels";
import {
  activeSignals,
  formatDateTime,
  formatHours,
  stateTone,
} from "../helpers";
import type { FilmingCard } from "../types";

import { SignalBadges } from "./signal-badges";

// Η κεφαλίδα του Γυρίσματος: κατάσταση, πότε, πού και τα σήματα. Οι ώρες είναι αυτές που κλείστηκαν, και οι πραγματικές μετά το «έγινε».
export function FilmingHeader({ card }: { card: FilmingCard }) {
  return (
    <Panel label="Γύρισμα">
      <div className="grid gap-3 text-sm">
        <div className="flex flex-wrap items-center gap-2">
          <Badge tone={stateTone(card.state)}>{STATE_LABELS[card.state]}</Badge>
          <SignalBadges signals={activeSignals(card.signals)} />
        </div>
        <dl className="m-0 grid grid-cols-[auto_1fr] gap-x-4 gap-y-2">
          <dt className="text-muted-foreground">Πότε</dt>
          <dd className="m-0">
            {formatDateTime(card.startsAt)} · {formatHours(card.hours)} ώρ.
            {card.actualHours !== null &&
              ` (πραγματικές ${formatHours(card.actualHours)} ώρ.)`}
          </dd>
          <dt className="text-muted-foreground">Πού</dt>
          <dd className="m-0">{card.location ?? "Δεν έχει οριστεί"}</dd>
          <dt className="text-muted-foreground">Πελάτης</dt>
          <dd className="m-0">{card.client?.name ?? NO_CLIENT_LABEL}</dd>
          <dt className="text-muted-foreground">Παραγωγή</dt>
          <dd className="m-0">{card.production.title}</dd>
          {card.agreement && (
            <>
              <dt className="text-muted-foreground">Συμφωνία</dt>
              <dd className="m-0">{card.agreement.title}</dd>
            </>
          )}
        </dl>
      </div>
    </Panel>
  );
}
