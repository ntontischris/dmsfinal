import type { CSSProperties, ReactNode, RefObject } from "react";

import { rand } from "@/screens/r1-scenes-a";
import { timecode, type Clip } from "@/screens/r1-clip";

// R1: το timeline της αίθουσας. V1 = οι Δουλειές ως κλιπ (κουμπιά), τα υπόλοιπα κανάλια είναι διακόσμηση.

const WAVE = (seed: number, width = 1000) =>
  Array.from({ length: width / 5 }, (_, i) => {
    const a =
      (0.25 +
        0.75 *
          Math.abs(
            Math.sin(i * 0.13 + seed) * Math.cos(i * 0.041 + seed * 2),
          )) *
      (0.55 + rand(i + seed) * 0.45);
    return `M${i * 5} ${(20 - a * 17).toFixed(2)} V${(20 + a * 17).toFixed(2)}`;
  }).join(" ");
const MUSIC = WAVE(1);

function Lane({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="r1-row">
      <span className="r1-lane-label">{label}</span>
      <div className="r1-lane">{children}</div>
    </div>
  );
}

interface TimelineProps {
  clips: readonly Clip[];
  active: number;
  tracksRef: RefObject<HTMLDivElement | null>;
  head: string;
  hint: string;
  titleLabels: readonly string[];
  musicLabel: string;
  onPick: (index: number) => void;
}

export function Timeline({
  clips,
  active,
  tracksRef,
  head,
  hint,
  titleLabels,
  musicLabel,
  onPick,
}: TimelineProps) {
  return (
    <div className="r1-panel r1-timeline">
      <p className="r1-panel-head kit-label">
        <span>{head}</span>
        <span>{hint}</span>
      </p>
      <div className="r1-scroll">
        <div ref={tracksRef} className="r1-tracks">
          <Lane label="TC">
            {Array.from({ length: 41 }, (_, i) => (
              <span
                key={i}
                className="r1-tick"
                data-major={i % 4 === 0}
                style={{ left: `${i * 2.5}%` }}
              >
                {i % 8 === 0 && i < 40 ? timecode(i / 40).slice(3, 8) : ""}
              </span>
            ))}
          </Lane>
          <Lane label="V2">
            {titleLabels.map((name, i) => (
              <span
                key={name}
                className="r1-clip r1-clip-title"
                style={{ left: `${[2, 40, 85][i]}%`, width: "11%" }}
              >
                {name}
              </span>
            ))}
          </Lane>
          <Lane label="V1">
            {clips.map((clip, i) => (
              <button
                key={clip.id}
                type="button"
                className="r1-clip r1-clip-video"
                aria-pressed={i === active}
                style={
                  {
                    left: `${clip.start}%`,
                    width: `${clip.length}%`,
                    "--hue": clip.hue,
                  } as CSSProperties
                }
                onClick={() => onPick(i)}
              >
                <b>{clip.title}</b>
                <small>{clip.code}</small>
              </button>
            ))}
          </Lane>
          <Lane label="A1">
            <span
              className="r1-clip r1-clip-audio"
              style={{ left: "0%", width: "100%" }}
            >
              <svg viewBox="0 0 1000 40" preserveAspectRatio="none" aria-hidden>
                <path d={MUSIC} />
              </svg>
              <small>{musicLabel}</small>
            </span>
          </Lane>
          <div className="r1-ph-layer" aria-hidden>
            <i className="r1-playhead" />
          </div>
        </div>
      </div>
    </div>
  );
}
