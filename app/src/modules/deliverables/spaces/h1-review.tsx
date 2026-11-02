import Link from "next/link";

import { hrefOf } from "@/spaces/data/screens";
import { Entity, Person } from "@/spaces/kit/parts";

import { NO_ASSIGNEE_LABEL } from "../labels";
import type { DeliverableCard } from "../types";
import { productionLabel, waitLabel } from "./h1-model";

import "./h1.css";

// «Προς έλεγχο» (prototype `screens/h1-review.tsx`). Η κάρτα της ουράς δεν φέρνει ποιος πρόσθεσε την Έκδοση και πότε·
// φαίνεται ο Ανατεθειμένος και πόσες μέρες περιμένει (από τη βάση).
export function ReviewTable({ items }: { items: readonly DeliverableCard[] }) {
  return (
    <>
      <p className="note">Η Έκδοση του Ελεγκτή δεν περνά από εδώ.</p>
      <table className="rtable">
        <thead>
          <tr>
            <th>Παραδοτέο</th>
            <th>Έκδοση</th>
            <th>Ανατεθειμένος</th>
            <th>Περιμένει</th>
            <th />
          </tr>
        </thead>
        <tbody>
          {items.map((d) => (
            <ReviewRow key={d.id} d={d} />
          ))}
        </tbody>
      </table>
    </>
  );
}

function ReviewRow({ d }: { d: DeliverableCard }) {
  const version = d.versionCount > 0 ? String(d.versionCount) : undefined;
  const href = hrefOf("H2", { id: d.id, v: version });
  return (
    <tr>
      <td data-label="Παραδοτέο" className="h1-cell">
        <Entity name={d.title} sub={productionLabel(d)} />
      </td>
      <td data-label="Έκδοση">
        {version ? <strong>{`v${version}`}</strong> : "—"}
      </td>
      <td data-label="Ανατεθειμένος">
        <Person name={d.assigneeName ?? NO_ASSIGNEE_LABEL} />
      </td>
      <td data-label="Περιμένει">{waitLabel(d.daysWaiting)}</td>
      <td>
        <Link className="button" data-primary="true" href={href}>
          Άνοιγμα για έλεγχο
        </Link>
      </td>
    </tr>
  );
}
