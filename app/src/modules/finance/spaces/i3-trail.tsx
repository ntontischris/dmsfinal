import { TRAIL_EMPTY } from "../invoice-corrections-labels";
import type { TrailRow } from "../invoice-trail";
import { Box } from "./i3-parts";

// Το Ίχνος της καταχώρισης (κλειστό κουτί), ίδιο με της σελίδας Τιμολογίου (I8): καταχώριση, διορθώσεις,
// πληρωμές και υπενθυμίσεις, παλαιότερο πρώτα.
export function InvoiceTrail({ rows }: { rows: readonly TrailRow[] }) {
  const hint = rows.length === 0 ? "τίποτα ακόμα" : `${rows.length} γραμμές`;
  return (
    <Box title="Ίχνος καταχώρισης" hint={hint}>
      {rows.length === 0 ? (
        <p className="muted">{TRAIL_EMPTY}</p>
      ) : (
        <ul className="ml-list i3-cover">
          {rows.map((row) => (
            <li key={row.id} className="ml-line">
              <span className="ml-main">
                <strong>{row.title}</strong>
                <small>{row.meta}</small>
              </span>
            </li>
          ))}
        </ul>
      )}
    </Box>
  );
}
