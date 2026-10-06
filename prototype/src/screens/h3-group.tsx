import Link from "next/link";

import { provisionKind } from "@/data/catalogue";
import type { RoleId } from "@/data/roles";
import { clientStatusOf, type PeriodGroup } from "@/screens/h3-model";
import { Badge, fmtDate, screenHref } from "@/screens/shared";

import "./h34.css";

export function ClientStatusBadge({ state }: { state: string }) {
  return (
    <Badge tone={state === "περιμένει εσένα" ? "attention" : undefined}>
      {state}
    </Badge>
  );
}

function Counter({ group }: { group: PeriodGroup }) {
  if (group.rows.length === 0) return null;
  return (
    <ul className="list">
      {group.rows.map((r) => (
        <li key={r.kindId}>
          <strong>{provisionKind(r.kindId).name}</strong>
          <div className="h34-total">
            <span>
              <strong>{r.total}</strong>
              <span className="muted">σύνολο</span>
            </span>
            <span>
              <strong>{r.used}</strong>
              <span className="muted">χρησιμοποιήθηκαν</span>
            </span>
            <span>
              <strong>{Math.max(0, r.total - r.used)}</strong>
              <span className="muted">απομένουν</span>
            </span>
          </div>
        </li>
      ))}
    </ul>
  );
}

export function PeriodCard({
  role,
  group,
}: {
  role: RoleId;
  group: PeriodGroup;
}) {
  return (
    <section className="card">
      <div className="card-title">
        <h2>{group.label}</h2>
        <span className="muted">{group.production.title}</span>
      </div>
      <Counter group={group} />
      <ul className="list">
        {group.deliverables.map((d) => (
          <li key={d.id} className="h34-item">
            <Link href={screenHref(role, "H4", { id: d.id })}>{d.title}</Link>
            <div className="h34-signals">
              <span className="muted">{provisionKind(d.kindId).name}</span>
              <ClientStatusBadge state={clientStatusOf(d.state)} />
              <span className="muted">
                γύροι αλλαγών: {d.rounds.used} από {d.rounds.limit}
              </span>
              {d.approvedAt && (
                <span className="muted">
                  εγκρίθηκε στις {fmtDate(d.approvedAt)}
                </span>
              )}
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}
