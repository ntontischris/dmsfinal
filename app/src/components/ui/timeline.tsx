import Link from "next/link";
import type { CSSProperties } from "react";

import type { Tone } from "@/components/ui/badge";
import { cn } from "@/lib/cn";

// Timeline (Μοντάζ): κανάλια με κλιπ σε άξονα ημερών, με playhead στο «σήμερα».
// Οι ημέρες είναι ακέραιοι (1 = πρώτη μέρα του εύρους).

export interface TimelineClip {
  id: string;
  label: string;
  from: number;
  to: number;
  tone?: Tone;
  href?: string;
}

export interface TimelineLane {
  name: string;
  clips: readonly TimelineClip[];
}

interface TimelineProps {
  days: number;
  ticks: readonly { day: number; label: string }[];
  today?: number;
  lanes: readonly TimelineLane[];
}

const CLIP_TONE: Record<Tone, string> = {
  strong: "border-primary/70 bg-primary/20",
  attention: "border-destructive/70 bg-destructive/20",
  ok: "border-ok/60 bg-ok/15",
};

const pct = (day: number, days: number): string =>
  `${((day - 1) / days) * 100}%`;

function Clip({ clip, days }: { clip: TimelineClip; days: number }) {
  const style: CSSProperties = {
    left: pct(clip.from, days),
    width: `calc(${((clip.to - clip.from + 1) / days) * 100}% - 2px)`,
  };
  const className = cn(
    "absolute inset-y-1.5 min-w-22 truncate rounded-sm border px-2 py-0.5 text-xs leading-normal text-foreground no-underline",
    clip.tone ? CLIP_TONE[clip.tone] : "border-border-strong bg-muted",
  );
  return clip.href ? (
    <Link
      className={className}
      style={style}
      href={clip.href}
      title={clip.label}
    >
      {clip.label}
    </Link>
  ) : (
    <span className={className} style={style} title={clip.label}>
      {clip.label}
    </span>
  );
}

const NAME = "kit-label border-r border-b bg-muted px-3 py-2 break-words";

export function Timeline({ days, ticks, today, lanes }: TimelineProps) {
  return (
    <div className="overflow-x-auto">
      <div className="relative grid min-w-xl grid-cols-[7.5rem_1fr]">
        <span className={NAME}>TC</span>
        <div className="relative h-7 border-b border-border-strong">
          {ticks.map((tick) => (
            <span
              key={tick.day}
              className="kit-label absolute top-1.5 translate-x-1"
              style={{ left: pct(tick.day, days) }}
            >
              {tick.label}
            </span>
          ))}
        </div>
        {lanes.map((lane) => (
          <div key={lane.name} className="contents">
            <span className={NAME}>{lane.name}</span>
            <div className="relative min-h-10 border-b">
              {lane.clips.map((clip) => (
                <Clip key={clip.id} clip={clip} days={days} />
              ))}
            </div>
          </div>
        ))}
        {today && (
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-y-0 right-0 left-30"
          >
            <span
              className="absolute inset-y-0 w-0.5 bg-destructive"
              style={{ left: pct(today, days) }}
            />
          </div>
        )}
      </div>
    </div>
  );
}
