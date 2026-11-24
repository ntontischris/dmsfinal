import Link from "next/link";

import { hrefOf } from "@/spaces/data/screens";
import { initialsOf } from "@/spaces/shell/avatar";

import { NO_ASSIGNEE_LABEL } from "../labels";
import type { DeliverableCard } from "../types";
import {
  deadlineLabel,
  productionLabel,
  waitLabel,
  waitingOn,
} from "./h1-model";

import "../../finance/spaces/money-lines.css";
import "./h1.css";

// Οι λίστες «για μένα» και «στον πελάτη» του H1, σε γραμμές-κάρτες (ml-line). Μένουν <table>, γιατί τα e2e
// βρίσκουν τη γραμμή ως `tr`.

// Τα φίλτρα της λίστας, για να γυρίσει το H2 πίσω στην ίδια προβολή.
export type ListQuery = Readonly<Record<string, string | undefined>>;

interface RowsProps {
  items: readonly DeliverableCard[];
  back?: ListQuery;
}

export function Thumb({ title }: { title: string }) {
  return (
    <td className="ml-thumb" aria-hidden="true">
      {initialsOf(title)}
    </td>
  );
}

// Ο τίτλος ανοίγει το ίδιο το Παραδοτέο· η Παραγωγή φαίνεται ως κείμενο, για να μην πατιέται κατά λάθος.
export function MainCell(props: {
  d: DeliverableCard;
  href?: string;
  tag: string;
  meta: readonly string[];
}) {
  return (
    <td className="ml-main h1-cell">
      <span className="ml-tag">{props.tag}</span>
      <strong>
        {props.href ? (
          <Link href={props.href}>{props.d.title}</Link>
        ) : (
          props.d.title
        )}
      </strong>
      <small>{[productionLabel(props.d), ...props.meta].join(" · ")}</small>
    </td>
  );
}

function WarnTag({ children }: { children: string }) {
  return (
    <span className="ml-tag" data-tone="warn">
      {children}
    </span>
  );
}

export function ForMeTable({ items, back }: RowsProps) {
  return (
    <table className="ml-table ml-list" aria-label="Παραδοτέα για μένα">
      <tbody>
        {items.map((d) => (
          <tr
            key={d.id}
            className="ml-line"
            data-urgent={d.isLate ? "" : undefined}
          >
            <Thumb title={d.title} />
            <MainCell
              d={d}
              href={hrefOf("H2", { ...back, id: d.id })}
              tag={d.kind}
              meta={[d.assigneeName ?? NO_ASSIGNEE_LABEL, waitingOn(d)]}
            />
            <td className="ml-amount">
              {deadlineLabel(d)}
              <small>Προθεσμία</small>
            </td>
            <td className="ml-quick h1-signals">
              {d.isLate && <WarnTag>καθυστερεί</WarnTag>}
              {d.overLimit && <WarnTag>πάνω από το όριο γύρων αλλαγών</WarnTag>}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

export function ClientQueueTable({ items, back }: RowsProps) {
  return (
    <table className="ml-table ml-list" aria-label="Παραδοτέα στον πελάτη">
      <tbody>
        {items.map((d) => (
          <tr key={d.id} className="ml-line">
            <Thumb title={d.title} />
            <MainCell
              d={d}
              href={hrefOf("H2", { ...back, id: d.id })}
              tag={d.versionCount > 0 ? `v${d.versionCount}` : "χωρίς Έκδοση"}
              meta={[]}
            />
            <td className="ml-amount">
              {waitLabel(d.daysWaiting)}
              <small>Αναμονή</small>
            </td>
            <td className="ml-quick h1-signals">
              {d.linkBroken && <WarnTag>δεν ανοίγει το link</WarnTag>}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
