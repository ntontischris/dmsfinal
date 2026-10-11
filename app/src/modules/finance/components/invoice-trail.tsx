import { Panel } from "@/components/ui/panel";

import { TRAIL_EMPTY, TRAIL_TITLE } from "../invoice-corrections-labels";
import { trailText } from "../invoice-detail-helpers";
import type { TrailEntry } from "../invoice-detail-schema";
import { athensToday, formatReceiptDate } from "../money";

interface InvoiceTrailProps {
  number: string;
  trail: readonly TrailEntry[];
}

// Το Ίχνος της καταχώρισης: ποιος, πότε, τι άλλαξε (παλιό → νέο). Άδειο όταν ο θεατής δεν βλέπει το Ίχνος.
export function InvoiceTrail({ number, trail }: InvoiceTrailProps) {
  return (
    <Panel label={`${TRAIL_TITLE}: ${number}`}>
      {trail.length === 0 ? (
        <p className="m-0 text-sm text-muted-foreground">{TRAIL_EMPTY}</p>
      ) : (
        <ul className="m-0 grid list-none gap-2 p-0 text-sm">
          {trail.map((entry) => (
            <li key={`${entry.at}-${entry.action}-${entry.reason ?? ""}`}>
              {formatReceiptDate(athensToday(new Date(entry.at)))} · {entry.byName ?? "—"}{" "}
              · {trailText(entry)}
            </li>
          ))}
        </ul>
      )}
    </Panel>
  );
}
