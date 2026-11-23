import Link from "next/link";

import type { Now } from "@/spaces/kit/now-tile";
import type { StatProps } from "@/spaces/kit/panel";

interface B1TopProps {
  stats: readonly StatProps[];
  now: Now | null;
}

function StatCard({ stat }: { stat: StatProps }) {
  const body = (
    <>
      <strong>{stat.value}</strong>
      <span>{stat.label}</span>
      {stat.hint && <small>{stat.hint}</small>}
    </>
  );
  return stat.href ? (
    <Link className="b1-card" href={stat.href}>
      {body}
    </Link>
  ) : (
    <div className="b1-card">{body}</div>
  );
}

// Οι αριθμοί της λωρίδας ως μια σύντομη σειρά από μαλακές κάρτες· το «Τώρα» μία από αυτές, με μικρή κίτρινη κουκκίδα.
export function B1Top({ stats, now }: B1TopProps) {
  if (stats.length === 0 && now === null) return null;
  return (
    <section className="b1-cards" aria-label="Με μια ματιά">
      {stats.map((stat) => (
        <StatCard key={stat.label} stat={stat} />
      ))}
      {now && (
        <Link className="b1-card b1-card-now" href={now.href}>
          <span>
            <i className="b1-now-dot" aria-hidden="true" /> {now.label}
          </span>
          <strong className="b1-now-title">{now.title}</strong>
          {now.detail && <small>{now.detail}</small>}
          <small className="b1-now-action">{now.action} →</small>
        </Link>
      )}
    </section>
  );
}
