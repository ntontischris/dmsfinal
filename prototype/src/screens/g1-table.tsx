import Link from "next/link";

import type { RoleId } from "@/data/roles";
import type { G1Row } from "@/screens/g1-rows";
import { Badge, screenHref } from "@/screens/shared";

import "./g1.css";

function Signals({ row }: { row: G1Row }) {
  const hasAny =
    row.late > 0 || row.inReview > 0 || row.needsHours || row.overrun;
  return (
    <span className="g1-signals">
      {row.late > 0 && <Badge tone="attention">{row.late} καθυστερημένα</Badge>}
      {row.inReview > 0 && <Badge>{row.inReview} προς έλεγχο</Badge>}
      {row.needsHours && <Badge tone="attention">χωρίς πραγματικές ώρες</Badge>}
      {row.overrun && <Badge tone="attention">Υπέρβαση κόστους</Badge>}
      {!hasAny && "—"}
    </span>
  );
}

export function G1Table({
  role,
  rows,
}: {
  role: RoleId;
  rows: readonly G1Row[];
}) {
  return (
    <table className="rtable">
      <thead>
        <tr>
          <th>Παραγωγή</th>
          <th>Πελάτης</th>
          <th>Περίοδος/είδος</th>
          <th>Υπεύθυνος</th>
          <th>Παραδοτέα</th>
          <th>Επόμενο Γύρισμα</th>
          <th>Κατάσταση</th>
          <th>Σήματα</th>
        </tr>
      </thead>
      <tbody>
        {rows.map((row) => (
          <tr key={row.id}>
            <td data-label="Παραγωγή">
              <Link href={screenHref(role, "G2", { id: row.id })}>
                {row.title}
              </Link>
            </td>
            <td data-label="Πελάτης">{row.client}</td>
            <td data-label="Περίοδος/είδος">{row.period}</td>
            <td data-label="Υπεύθυνος">{row.owner}</td>
            <td data-label="Παραδοτέα">{row.deliverables}</td>
            <td data-label="Επόμενο Γύρισμα" className="g1-when">
              {row.nextFilming}
            </td>
            <td data-label="Κατάσταση">
              <Badge>{row.state}</Badge>
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
