import Link from "next/link";

import type { P1Row, P1Value } from "./p1-adapter";

// Ποσά και κόστος έρχονται κρυμμένα από τη βάση ανά Δικαίωμα· η γραμμή μένει πάντα.
function Value({ value }: { value: P1Value }) {
  return value.isHidden ? (
    <span className="p1-hidden">— {value.text} —</span>
  ) : (
    <>{value.text}</>
  );
}

function BeforeAfter({ row }: { row: P1Row }) {
  if (row.changes.length === 0) return null;
  return (
    <small className="p1-ba">
      {row.changes.map((change, index) => (
        <span key={change.key}>
          {index > 0 && <br />}
          {change.key}: {change.before && <Value value={change.before} />}
          {change.before && change.after && " → "}
          {change.after && <Value value={change.after} />}
        </span>
      ))}
      {row.more && (
        <>
          <br />
          <span className="muted">{row.more}</span>
        </>
      )}
    </small>
  );
}

function AuditLine({ row }: { row: P1Row }) {
  return (
    <li className="ml-line">
      <time className="ml-thumb p1-when" dateTime={row.at}>
        {row.when}
      </time>
      <span className="ml-main">
        {row.href ? (
          <Link href={row.href}>
            <strong>{row.title}</strong>
          </Link>
        ) : (
          <strong>{row.title}</strong>
        )}
        <small>
          {row.actor} · {row.area}
        </small>
        <BeforeAfter row={row} />
      </span>
      <span className="ml-tag">{row.action}</span>
    </li>
  );
}

// Οι εγγραφές του Ίχνους: ανοιχτό κουτί, γιατί είναι η δουλειά της οθόνης.
export function AuditTable({ rows }: { rows: readonly P1Row[] }) {
  return (
    <details className="ml-box" open>
      <summary>
        <h2 className="ml-box-title">Εγγραφές</h2>
        <small>{rows.length}</small>
      </summary>
      <ul className="ml-list">
        {rows.map((row) => (
          <AuditLine key={row.id} row={row} />
        ))}
      </ul>
    </details>
  );
}
