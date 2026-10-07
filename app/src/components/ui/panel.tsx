import Link from "next/link";
import type { ReactNode } from "react";

import type { Tone } from "@/components/ui/badge";
import { cn } from "@/lib/cn";

// Πάνελ με κεφαλίδα-ετικέτα, όπως τα πάνελ της αίθουσας μοντάζ.
interface PanelProps {
  label: string;
  aside?: ReactNode;
  isFlush?: boolean;
  className?: string;
  children: ReactNode;
}

export function Panel({
  label,
  aside,
  isFlush = false,
  className,
  children,
}: PanelProps) {
  return (
    <section
      className={cn(
        "min-w-0 overflow-hidden rounded-md border bg-card",
        className,
      )}
    >
      <header className="flex flex-wrap items-center justify-between gap-2 border-b bg-muted px-3 py-2">
        <h2 className="kit-label m-0">{label}</h2>
        {aside && <span className="kit-label">{aside}</span>}
      </header>
      <div className={isFlush ? "" : "p-4"}>{children}</div>
    </section>
  );
}

// Κάρτα δείκτη: ένας αριθμός που απαντά μία ερώτηση. Με href ανοίγει τη λίστα πίσω του.
export interface StatProps {
  label: string;
  value: string;
  hint?: string;
  tone?: Tone;
  href?: string;
}

const STAT_TOP: Record<Tone, string> = {
  attention: "border-t-destructive",
  strong: "border-t-primary",
  ok: "border-t-ok",
};

export function Stat({ label, value, hint, tone, href }: StatProps) {
  const className = cn(
    "grid min-w-0 content-start gap-1 rounded-md border border-t-2 bg-card px-4 py-3 no-underline",
    tone ? STAT_TOP[tone] : "border-t-border-strong",
    href && "hover:border-border-strong",
  );
  const body = (
    <>
      <span className="kit-label">{label}</span>
      <span
        className={cn(
          "text-[clamp(1.5rem,1.2rem+1.2vw,2.1rem)] font-medium leading-tight tracking-tight tabular-nums",
          tone === "attention" && "text-destructive",
        )}
      >
        {value}
      </span>
      {hint && <span className="text-sm text-muted-foreground">{hint}</span>}
    </>
  );
  return href ? (
    <Link className={className} href={href}>
      {body}
    </Link>
  ) : (
    <div className={className}>{body}</div>
  );
}

export function StatGrid({ items }: { items: readonly StatProps[] }) {
  return (
    <div className="grid grid-cols-2 gap-3 md:grid-cols-[repeat(auto-fit,minmax(11rem,1fr))]">
      {items.map((item) => (
        <Stat key={item.label} {...item} />
      ))}
    </div>
  );
}
