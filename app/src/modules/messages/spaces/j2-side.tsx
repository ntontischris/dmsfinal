import Link from "next/link";

import { SIDE_TITLE } from "../request-labels";
import type { J2SideRow } from "./j2-adapter";

import "../../finance/spaces/money-lines.css";
import "./j2.css";

const countText = (rows: readonly J2SideRow[]): string => {
  const open = rows.filter((row) => row.isOpen).length;
  return rows.length === 0 ? "κανένα" : `${open} ανοιχτά από ${rows.length}`;
};

// «Αιτήματα αυτού του Πελάτη» ως κουτί `.ml-box` δίπλα στη Συνομιλία: ανοιχτά πρώτα, κλεισμένα αχνά.
export function J2Side({ rows }: { rows: readonly J2SideRow[] }) {
  return (
    <aside className="j2-side" aria-label={SIDE_TITLE}>
      <details className="ml-box" open>
        <summary>
          <span className="ml-box-title">{SIDE_TITLE}</span>
          <small>{countText(rows)}</small>
        </summary>
        {rows.length === 0 ? (
          <p className="muted j2-side-empty">Κανένα Αίτημα.</p>
        ) : (
          <ul>
            {rows.map((row) => (
              <li
                key={row.key}
                className="j2-side-row"
                data-faded={!row.isOpen || undefined}
              >
                <Link href={row.href}>{row.title}</Link>
                <small>
                  {row.state} · {row.sub}
                </small>
              </li>
            ))}
          </ul>
        )}
      </details>
    </aside>
  );
}
