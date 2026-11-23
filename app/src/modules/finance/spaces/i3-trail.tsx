import { fmtDate } from "@/spaces/screens/shared";

import { TRAIL_EMPTY } from "../invoice-corrections-labels";
import { trailText } from "../invoice-detail-helpers";
import type { TrailEntry } from "../invoice-detail-schema";
import { athensToday } from "../money";
import { Box } from "./i3-parts";

const dayOf = (at: string): string => fmtDate(athensToday(new Date(at)));

// Το Ίχνος της καταχώρισης (κλειστό κουτί): ποιος, πότε, τι άλλαξε. Άδειο όταν ο θεατής δεν το βλέπει.
export function InvoiceTrail({ trail }: { trail: readonly TrailEntry[] }) {
  const hint = trail.length === 0 ? "κενό για εσένα" : `${trail.length} ενέργειες: ποιος, πότε, τι άλλαξε`;
  return (
    <Box title="Ίχνος καταχώρισης" hint={hint}>
      {trail.length === 0 ? (
        <p className="muted">{TRAIL_EMPTY}</p>
      ) : (
        <ul className="ml-list i3-cover">
          {trail.map((entry) => (
            <li key={`${entry.at}-${entry.action}-${entry.reason ?? ""}`} className="ml-line">
              <span className="ml-thumb i3-day">{dayOf(entry.at).slice(0, 5)}</span>
              <span className="ml-main">
                <strong>{trailText(entry)}</strong>
                <small>
                  {dayOf(entry.at)} · {entry.byName ?? "—"}
                </small>
              </span>
            </li>
          ))}
        </ul>
      )}
    </Box>
  );
}
