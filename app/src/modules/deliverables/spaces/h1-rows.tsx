import { hrefOf } from "@/spaces/data/screens";
import { Due, Entity, Person } from "@/spaces/kit/parts";
import { Badge } from "@/spaces/screens/shared";

import { NO_ASSIGNEE_LABEL } from "../labels";
import type { DeliverableCard } from "../types";
import {
  deadlineLabel,
  productionLabel,
  waitLabel,
  waitingOn,
} from "./h1-model";

import "./h1.css";

// Οι πίνακες «για μένα» και «στον πελάτη» του H1 (prototype `screens/h1-rows.tsx`).

// Τα φίλτρα της λίστας, για να γυρίσει το H2 πίσω στην ίδια προβολή.
export type ListQuery = Readonly<Record<string, string | undefined>>;

interface RowsProps {
  items: readonly DeliverableCard[];
  back?: ListQuery;
}

// Ο τίτλος ανοίγει το ίδιο το Παραδοτέο· η Παραγωγή φαίνεται ως κείμενο, για να μην πατιέται κατά λάθος.
function TitleCell({ d, back }: { d: DeliverableCard; back?: ListQuery }) {
  return (
    <td data-label="Παραδοτέο" className="h1-cell">
      <Entity
        name={d.title}
        href={hrefOf("H2", { ...back, id: d.id })}
        sub={productionLabel(d)}
      />
    </td>
  );
}

export function ForMeTable({ items, back }: RowsProps) {
  return (
    <table className="rtable">
      <thead>
        <tr>
          <th>Παραδοτέο</th>
          <th>Είδος</th>
          <th>Ανατεθειμένος</th>
          <th>Τι περιμένει</th>
          <th>Προθεσμία</th>
          <th>Σήματα</th>
        </tr>
      </thead>
      <tbody>
        {items.map((d) => (
          <tr key={d.id}>
            <TitleCell d={d} back={back} />
            <td data-label="Είδος">{d.kind}</td>
            <td data-label="Ανατεθειμένος">
              <Person name={d.assigneeName ?? NO_ASSIGNEE_LABEL} />
            </td>
            <td data-label="Τι περιμένει" className="h1-cell">
              {waitingOn(d)}
            </td>
            <td data-label="Προθεσμία" className="h1-cell">
              {d.isLate ? (
                <Due isLate>{deadlineLabel(d)}</Due>
              ) : (
                deadlineLabel(d)
              )}
            </td>
            <td data-label="Σήματα">
              <span className="h1-signals">
                {d.isLate && <Badge tone="attention">καθυστερεί</Badge>}
                {d.overLimit && (
                  <Badge tone="attention">πάνω από το όριο γύρων αλλαγών</Badge>
                )}
              </span>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

export function ClientQueueTable({ items, back }: RowsProps) {
  return (
    <table className="rtable">
      <thead>
        <tr>
          <th>Παραδοτέο</th>
          <th>Έκδοση</th>
          <th>Αναμονή</th>
          <th>Σήματα</th>
        </tr>
      </thead>
      <tbody>
        {items.map((d) => (
          <tr key={d.id}>
            <TitleCell d={d} back={back} />
            <td data-label="Έκδοση">
              {d.versionCount > 0 ? (
                <strong>{`v${d.versionCount}`}</strong>
              ) : (
                "—"
              )}
            </td>
            <td data-label="Αναμονή">{waitLabel(d.daysWaiting)}</td>
            <td data-label="Σήματα">
              {d.linkBroken && (
                <Badge tone="attention">δεν ανοίγει το link</Badge>
              )}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
