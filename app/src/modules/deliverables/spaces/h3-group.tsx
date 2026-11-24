import Link from "next/link";
import type { CSSProperties } from "react";

import { hrefOf } from "@/spaces/data/screens";
import { Badge } from "@/spaces/screens/shared";
import { initialsOf } from "@/spaces/shell/avatar";

import { H2Box } from "./h2-box";
import { CLIENT_WORDS, countWord, rowSubOf, type H3Group } from "./h3-adapter";

import "./h34.css";

// Μία Περίοδος της H3 ως κουτί: μετρητές Παροχών (.ml-meter) και τα Παραδοτέα της ως γραμμές.

export function ClientStatusBadge({ state }: { state: string }) {
  return (
    <Badge tone={state === "περιμένει εσένα" ? "attention" : undefined}>
      {state}
    </Badge>
  );
}

const percentOf = (part: number, total: number): string =>
  `${total === 0 ? 0 : Math.round((part / total) * 100)}%`;

function Counter({ group }: { group: H3Group }) {
  if (group.rows.length === 0) return null;
  return (
    <ul className="h34-counters">
      {group.rows.map((r) => (
        <li key={r.label}>
          <span
            className="ml-meter"
            role="meter"
            aria-label={`${r.label}: ${r.used} από ${r.total}`}
            aria-valuenow={r.used}
            aria-valuemin={0}
            aria-valuemax={r.total}
            style={{ "--v": percentOf(r.used, r.total) } as CSSProperties}
          >
            <span>{r.label}</span>
            <i>
              <b />
            </i>
            <strong>
              {r.used}/{r.total}
            </strong>
          </span>
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

export function PeriodCard({
  group,
  isOpen = false,
}: {
  group: H3Group;
  isOpen?: boolean;
}) {
  return (
    <H2Box
      title={group.label}
      hint={`${group.deliverables.length} Παραδοτέα`}
      isOpen={isOpen}
    >
      <Counter group={group} />
      {group.deliverables.length === 0 ? (
        <p className="ml-empty">Κανένα Παραδοτέο ακόμα.</p>
      ) : (
        <ul className="ml-list">
          {group.deliverables.map((d) => (
            <li key={d.id} className="ml-line">
              <span className="ml-thumb" aria-hidden="true">
                {initialsOf(d.title)}
              </span>
              <span className="ml-main">
                <strong>
                  <Link href={hrefOf("H2", { id: d.id })}>{d.title}</Link>
                </strong>
                <small>{rowSubOf(d)}</small>
              </span>
              <span className="ml-quick">
                <ClientStatusBadge state={CLIENT_WORDS[d.state]} />
              </span>
            </li>
          ))}
        </ul>
      )}
    </H2Box>
  );
}
