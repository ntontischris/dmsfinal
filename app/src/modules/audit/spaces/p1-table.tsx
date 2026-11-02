import { ListRow, Person, RowList } from "@/spaces/kit/parts";
import { Panel } from "@/spaces/kit/panel";
import { Badge } from "@/spaces/screens/shared";

import { AUDIT_TITLE } from "../labels";
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
  if (row.changes.length === 0) return <>—</>;
  return (
    <span className="p1-ba">
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
    </span>
  );
}

export function AuditTable({ rows }: { rows: readonly P1Row[] }) {
  return (
    <Panel label={AUDIT_TITLE} aside={`${rows.length}`} isFlush>
      <RowList>
        {rows.map((e) => (
          <ListRow
            key={e.id}
            lead={
              <time className="p1-when" dateTime={e.at}>
                {e.when}
              </time>
            }
            href={e.href}
            title={e.title}
            sub={
              <>
                <Person name={e.actor} /> · {e.area}
              </>
            }
            aside={
              <>
                <BeforeAfter row={e} />
                <Badge>{e.action}</Badge>
              </>
            }
          />
        ))}
      </RowList>
    </Panel>
  );
}
