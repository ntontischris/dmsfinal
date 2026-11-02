import { ListRow, RowList } from "@/spaces/kit/parts";
import { Panel } from "@/spaces/kit/panel";
import { fmtDate } from "@/spaces/screens/shared";

import { TRAIL_EMPTY } from "../invoice-corrections-labels";
import { trailText } from "../invoice-detail-helpers";
import type { TrailEntry } from "../invoice-detail-schema";
import { athensToday } from "../money";

// Το Ίχνος της καταχώρισης (prototype `screens/i3-trail.tsx`): ποιος, πότε, τι άλλαξε. Άδειο όταν ο θεατής δεν το βλέπει.
export function InvoiceTrail({ number, trail }: { number: string; trail: readonly TrailEntry[] }) {
  return (
    <Panel label={`Ίχνος καταχώρισης: ${number}`}>
      {trail.length === 0 ? (
        <p className="muted">{TRAIL_EMPTY}</p>
      ) : (
        <RowList>
          {trail.map((entry) => (
            <ListRow
              key={`${entry.at}-${entry.action}-${entry.reason ?? ""}`}
              lead={<span className="i13-date">{fmtDate(athensToday(new Date(entry.at)))}</span>}
              title={trailText(entry)}
              sub={entry.byName ?? "—"}
            />
          ))}
        </RowList>
      )}
    </Panel>
  );
}
