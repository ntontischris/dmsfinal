import Link from "next/link";
import type { ReactNode } from "react";

import type { BadgeTone } from "@/screens/shared";

// Πάνελ με κεφαλίδα-ετικέτα, όπως τα πάνελ της αίθουσας μοντάζ.
interface PanelProps {
  label: string;
  aside?: ReactNode;
  isFlush?: boolean;
  children: ReactNode;
}

export function Panel({ label, aside, isFlush = false, children }: PanelProps) {
  return (
    <section className="kit-panel">
      <header className="kit-panel-head">
        <h2 className="kit-label" style={{ margin: 0 }}>
          {label}
        </h2>
        {aside && <span className="kit-label">{aside}</span>}
      </header>
      <div className="kit-panel-body" data-flush={isFlush}>
        {children}
      </div>
    </section>
  );
}

// Κάρτα δείκτη: ένας αριθμός που απαντά μία ερώτηση. Με href ανοίγει τη λίστα πίσω του.
export interface StatProps {
  label: string;
  value: string;
  hint?: string;
  tone?: BadgeTone;
  href?: string;
}

export function Stat({ label, value, hint, tone, href }: StatProps) {
  const body = (
    <>
      <span className="kit-label">{label}</span>
      <span className="kit-stat-value">{value}</span>
      {hint && <span className="kit-stat-hint">{hint}</span>}
    </>
  );
  return href ? (
    <Link className="kit-stat" data-tone={tone} href={href}>
      {body}
    </Link>
  ) : (
    <div className="kit-stat" data-tone={tone}>
      {body}
    </div>
  );
}

export function StatGrid({ items }: { items: readonly StatProps[] }) {
  return (
    <div className="kit-stats">
      {items.map((item) => (
        <Stat key={item.label} {...item} />
      ))}
    </div>
  );
}
