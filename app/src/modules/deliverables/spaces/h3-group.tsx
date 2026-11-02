import { hrefOf } from "@/spaces/data/screens";
import { Panel } from "@/spaces/kit/panel";
import { ListRow, RowList, Segments } from "@/spaces/kit/parts";
import { Badge } from "@/spaces/screens/shared";
import { initialsOf } from "@/spaces/shell/avatar";

import { CLIENT_WORDS, countWord, rowSubOf, type H3Group } from "./h3-adapter";

import "./h34.css";

// Μία Περίοδος της H3 (prototype `screens/h3-group.tsx`): μετρητές Παροχών και τα Παραδοτέα της.

export function ClientStatusBadge({ state }: { state: string }) {
  return (
    <Badge tone={state === "περιμένει εσένα" ? "attention" : undefined}>
      {state}
    </Badge>
  );
}

function Counter({ group }: { group: H3Group }) {
  if (group.rows.length === 0) return null;
  return (
    <ul className="h34-counters">
      {group.rows.map((r) => (
        <li key={r.label}>
          <Segments label={r.label} used={r.used} total={r.total} />
          <div className="h34-total">
            <span>
              <strong>{r.total}</strong>
              <span className="muted">σύνολο</span>
            </span>
            <span>
              <strong>{r.used}</strong>
              <span className="muted">
                {countWord(r.used, "έγινε", "έγιναν")}
              </span>
            </span>
            <span>
              <strong>{r.left}</strong>
              <span className="muted">
                {countWord(r.left, "μένει", "μένουν")}
              </span>
            </span>
          </div>
        </li>
      ))}
    </ul>
  );
}

export function PeriodCard({ group }: { group: H3Group }) {
  return (
    <Panel label={group.label}>
      <Counter group={group} />
      {group.deliverables.length === 0 ? (
        <p className="muted">Κανένα Παραδοτέο ακόμα.</p>
      ) : (
        <RowList>
          {group.deliverables.map((d) => (
            <ListRow
              key={d.id}
              lead={
                <span className="part-tile" aria-hidden="true">
                  {initialsOf(d.title)}
                </span>
              }
              href={hrefOf("H2", { id: d.id })}
              title={d.title}
              sub={rowSubOf(d)}
              aside={<ClientStatusBadge state={CLIENT_WORDS[d.state]} />}
            />
          ))}
        </RowList>
      )}
    </Panel>
  );
}
