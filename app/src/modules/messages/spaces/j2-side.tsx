import { Panel } from "@/spaces/kit/panel";
import { ListRow, RowList } from "@/spaces/kit/parts";
import { Badge } from "@/spaces/screens/shared";

import type { J2SideRow } from "./j2-adapter";

// «Αιτήματα αυτού του Πελάτη» του prototype (`screens/j2-side.tsx`): ανοιχτά πρώτα.
export function J2Side({ rows }: { rows: readonly J2SideRow[] }) {
  return (
    <aside className="j2-side">
      <Panel label="Αιτήματα αυτού του Πελάτη" aside={rows.length} isFlush>
        {rows.length === 0 && (
          <p className="muted j2-side-empty">Κανένα Αίτημα.</p>
        )}
        <RowList>
          {rows.map((row) => (
            <ListRow
              key={row.key}
              href={row.href}
              title={row.title}
              isFaded={!row.isOpen}
              sub={row.sub}
              aside={
                <Badge tone={row.isOpen ? "strong" : undefined}>
                  {row.state}
                </Badge>
              }
            />
          ))}
        </RowList>
      </Panel>
    </aside>
  );
}
