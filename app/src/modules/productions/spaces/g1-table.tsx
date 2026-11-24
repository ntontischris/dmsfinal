import Link from "next/link";

import { hrefOf } from "@/spaces/data/screens";
import { initialsOf } from "@/spaces/shell/avatar";

import type { G1Row } from "./g1-rows";

import "../../finance/spaces/money-lines.css";
import "./g1.css";

// Τα σήματα της γραμμής ως ετικέτες· χωρίς σήμα, τίποτα.
function Signals({ row }: { row: G1Row }) {
  return (
    <>
      {row.inReview > 0 && (
        <span className="ml-tag">{row.inReview} προς έλεγχο</span>
      )}
      {row.needsHours && (
        <span className="ml-tag" data-tone="warn">
          χωρίς πραγματικές ώρες
        </span>
      )}
      {row.overrun && (
        <span className="ml-tag" data-tone="warn">
          Υπέρβαση κόστους
        </span>
      )}
    </>
  );
}

const metaOf = (row: G1Row): string =>
  [row.client, row.period, row.owner].join(" · ");

// Η λίστα Παραγωγών (μορφή της I2): μία γραμμή-κάρτα ανά Παραγωγή με κατάσταση, Πελάτη, Περίοδο, Υπεύθυνο,
// επόμενο Γύρισμα και σήματα. Μένει <table> (τα e2e βρίσκουν τη γραμμή ως `tr`), αλλά κάθε <tr> είναι .ml-line.
export function G1Table({ rows }: { rows: readonly G1Row[] }) {
  return (
    <table className="ml-table ml-list">
      <thead>
        <tr>
          <th>Αρχικά</th>
          <th>Παραγωγή</th>
          <th>Επόμενο Γύρισμα</th>
          <th>Σήματα</th>
        </tr>
      </thead>
      <tbody>
        {rows.map((row) => (
          <tr
            key={row.id}
            className="ml-line"
            data-urgent={row.overrun ? "" : undefined}
            data-faded={row.state === "ακυρωμένη" ? "" : undefined}
          >
            <td className="ml-thumb" aria-hidden="true">
              {initialsOf(row.title)}
            </td>
            <td className="ml-main">
              <span className="ml-tag">{row.state}</span>
              <strong>
                <Link href={hrefOf("G2", { id: row.id })}>{row.title}</Link>
              </strong>
              <small>{metaOf(row)}</small>
            </td>
            <td className="ml-amount g1-when">
              {row.nextFilming}
              <small>επόμενο Γύρισμα</small>
            </td>
            <td className="ml-quick g1-signals">
              <Signals row={row} />
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
