import Link from "next/link";
import type { CSSProperties } from "react";

import type { BadgeTone } from "@/screens/shared";

// Timeline (Μοντάζ): κανάλια με κλιπ πάνω σε άξονα ημερών, με playhead στο «σήμερα».
// Οι ημέρες είναι ακέραιοι (1 = πρώτη μέρα του εύρους), για να μένει απλό.

export interface TimelineClip {
  id: string;
  label: string;
  from: number;
  to: number;
  tone?: BadgeTone;
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

const pct = (day: number, days: number): string =>
  `${((day - 1) / days) * 100}%`;

function Clip({ clip, days }: { clip: TimelineClip; days: number }) {
  const style: CSSProperties = {
    left: pct(clip.from, days),
    width: `calc(${((clip.to - clip.from + 1) / days) * 100}% - 2px)`,
  };
  const title = clip.label;
  return clip.href ? (
    <Link
      className="kit-tl-clip"
      data-tone={clip.tone}
      style={style}
      href={clip.href}
      title={title}
    >
      {clip.label}
    </Link>
  ) : (
    <span
      className="kit-tl-clip"
      data-tone={clip.tone}
      style={style}
      title={title}
    >
      {clip.label}
    </span>
  );
}

export function Timeline({ days, ticks, today, lanes }: TimelineProps) {
  const style = { "--kit-tl-cols": ticks.length } as CSSProperties;
  return (
    <div className="kit-timeline">
      <div className="kit-tl" style={style}>
        <span className="kit-tl-name kit-label">TC</span>
        <div className="kit-tl-ticks">
          {ticks.map((tick) => (
            <span
              key={tick.day}
              className="kit-tl-tick kit-label"
              style={{ left: pct(tick.day, days) }}
            >
              {tick.label}
            </span>
          ))}
        </div>
        {lanes.map((lane) => (
          <div key={lane.name} className="kit-tl-lane">
            <span className="kit-tl-name kit-label">{lane.name}</span>
            <div className="kit-tl-track">
              {lane.clips.map((clip) => (
                <Clip key={clip.id} clip={clip} days={days} />
              ))}
            </div>
          </div>
        ))}
        {today && (
          <div className="kit-tl-overlay" aria-hidden="true">
            <span className="kit-tl-head" style={{ left: pct(today, days) }} />
          </div>
        )}
      </div>
    </div>
  );
}
