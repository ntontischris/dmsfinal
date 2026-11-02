import { hrefOf } from "@/spaces/data/screens";
import { Entity, Person } from "@/spaces/kit/parts";
import { Badge, type BadgeTone } from "@/spaces/screens/shared";

import type { G1Row } from "./g1-rows";

import "./g1.css";

const STATE_TONE: Readonly<Record<string, BadgeTone>> = {
  ανοιχτή: "strong",
  παραδομένη: "ok",
  ακυρωμένη: "faded",
};

function Signals({ row }: { row: G1Row }) {
  const hasAny = row.inReview > 0 || row.needsHours || row.overrun;
  return (
    <span className="g1-signals">
      {row.inReview > 0 && <Badge>{row.inReview} προς έλεγχο</Badge>}
      {row.needsHours && <Badge tone="attention">χωρίς πραγματικές ώρες</Badge>}
      {row.overrun && <Badge tone="attention">Υπέρβαση κόστους</Badge>}
      {!hasAny && "—"}
    </span>
  );
}

// Ο πίνακας Παραγωγών του prototype (`screens/g1-table.tsx`). Η στήλη «Παραδοτέα» (πρόοδος εγκρίσεων) λείπει:
// η λίστα της βάσης δεν φέρνει τα Παραδοτέα κάθε Παραγωγής.
export function G1Table({ rows }: { rows: readonly G1Row[] }) {
  return (
    <table className="rtable">
      <thead>
        <tr>
          <th>Παραγωγή</th>
          <th>Πελάτης</th>
          <th>Περίοδος/είδος</th>
          <th>Υπεύθυνος</th>
          <th>Επόμενο Γύρισμα</th>
          <th>Κατάσταση</th>
          <th>Σήματα</th>
        </tr>
      </thead>
      <tbody>
        {rows.map((row) => (
          <tr key={row.id}>
            <td data-label="Παραγωγή">
              <Entity
                name={row.title}
                href={hrefOf("G2", { id: row.id })}
                sub={row.client}
              />
            </td>
            <td data-label="Πελάτης">{row.client}</td>
            <td data-label="Περίοδος/είδος">{row.period}</td>
            <td data-label="Υπεύθυνος">
              <Person name={row.owner} />
            </td>
            <td data-label="Επόμενο Γύρισμα" className="g1-when">
              {row.nextFilming}
            </td>
            <td data-label="Κατάσταση">
              <Badge tone={STATE_TONE[row.state]}>{row.state}</Badge>
            </td>
            <td data-label="Σήματα">
              <Signals row={row} />
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
