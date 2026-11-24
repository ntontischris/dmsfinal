import Link from "next/link";

import { hrefOf } from "@/spaces/data/screens";

import { NO_ASSIGNEE_LABEL } from "../labels";
import type { DeliverableCard } from "../types";
import { waitLabel } from "./h1-model";
import { MainCell, Thumb } from "./h1-rows";

import "../../finance/spaces/money-lines.css";
import "./h1.css";

// «Προς έλεγχο»: η κάρτα της ουράς δεν φέρνει ποιος πρόσθεσε την Έκδοση και πότε· φαίνεται ο Ανατεθειμένος και
// πόσες μέρες περιμένει (από τη βάση).
export function ReviewTable({ items }: { items: readonly DeliverableCard[] }) {
  return (
    <>
      <p className="note">Η Έκδοση του Ελεγκτή δεν περνά από εδώ.</p>
      <table className="ml-table ml-list" aria-label="Προς έλεγχο">
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
    <tr className="ml-line">
      <Thumb title={d.title} />
      <MainCell
        d={d}
        tag={version ? `v${version}` : "—"}
        meta={[d.assigneeName ?? NO_ASSIGNEE_LABEL]}
      />
      <td className="ml-amount">
        {waitLabel(d.daysWaiting)}
        <small>Περιμένει</small>
      </td>
      <td className="ml-quick">
        <Link data-primary="true" href={href}>
          Άνοιγμα για έλεγχο
        </Link>
      </td>
    </tr>
  );
}
