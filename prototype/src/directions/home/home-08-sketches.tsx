import type { ReactNode } from "react";

// Σχέδια storyboard για την πρόταση 8. viewBox 160×90, μολύβι (currentColor) με «χειροποίητο» φίλτρο.

export type SketchName =
  | "office"
  | "talk"
  | "cup"
  | "shop"
  | "tripod"
  | "gimbal"
  | "timeline"
  | "grade"
  | "sound"
  | "files"
  | "phone"
  | "screening";

const H = "url(#r8-hatch)";

export const SKETCHES: Record<SketchName, ReactNode> = {
  office: (
    <>
      <rect x="98" y="10" width="50" height="42" />
      <path d="M123 10v42M98 31h50" />
      <rect x="99" y="11" width="23" height="19" fill={H} stroke="none" />
      <path d="M6 64h118M18 64v20M112 64v20M4 84h150" />
      <circle cx="44" cy="36" r="6" />
      <path d="M34 64q2-18 10-20q9 2 11 20" />
      <circle cx="80" cy="40" r="5.5" />
      <path d="M71 64q2-15 9-18q8 3 10 18" />
      <path d="M52 64l4-9h16l-3 9" />
    </>
  ),
  talk: (
    <>
      <circle cx="66" cy="36" r="13" />
      <path d="M58 33q3-2 5 0M70 33q3-2 5 0M62 43q4 3 8 0" />
      <path d="M34 90q4-28 32-31q28 3 32 31" />
      <path d="M58 59l8 10l8-10" />
      <rect x="46" y="18" width="42" height="56" strokeDasharray="3 3" />
      <path d="M150 78l-26-18M124 60l9 1M124 60l3 8" />
      <path d="M100 10h56v80" fill={H} stroke="none" opacity="0.5" />
    </>
  ),
  cup: (
    <>
      <ellipse cx="78" cy="44" rx="24" ry="6" />
      <path d="M54 44l6 30q18 6 36 0l6-30" />
      <path d="M102 50q14 0 12 10q-2 9-14 8" />
      <path d="M30 80h100" />
      <path d="M70 34q-5-7 0-13q5-6 0-13M84 34q-5-7 0-13q5-6 0-13" />
      <path d="M60 60q18 6 36 0v12q-18 6-36 0z" fill={H} stroke="none" />
    </>
  ),
  shop: (
    <>
      <circle cx="136" cy="18" r="8" />
      <path d="M136 4v-2M150 18h3M146 8l2-2M124 8l-2-2" />
      <path d="M40 30h80l-6 12H46z" />
      <path d="M54 30l-3 12M68 30l-2 12M82 30v12M96 30l2 12M110 30l3 12" />
      <path d="M46 42v38h68V42" />
      <rect x="72" y="52" width="16" height="28" />
      <rect x="52" y="50" width="14" height="14" fill={H} />
      <rect x="94" y="50" width="14" height="14" fill={H} />
      <path d="M4 80h152" />
      <path d="M18 80l6-22l6 22M24 58v-6h-6v6z" />
    </>
  ),
  tripod: (
    <>
      <rect x="56" y="24" width="40" height="24" rx="2" />
      <rect x="96" y="29" width="16" height="14" />
      <circle cx="104" cy="36" r="4" />
      <path d="M64 24v-6h14v6" />
      <path d="M76 48v8M76 56l-24 30M76 56l24 30M76 56v30" />
      <path d="M20 86h120" />
      <rect x="57" y="25" width="38" height="22" fill={H} stroke="none" />
    </>
  ),
  gimbal: (
    <>
      <circle cx="62" cy="22" r="7" />
      <path d="M62 29l-2 26l-10 28M60 55l12 28M61 36l18 8" />
      <path d="M79 44l6-6h10v10h-10z" />
      <path d="M95 43h8" />
      <path d="M14 40h24M8 52h26M18 64h18" strokeDasharray="4 3" />
      <path d="M4 84h152" />
      <path d="M120 30l20 10l-20 10" />
    </>
  ),
  timeline: (
    <>
      <rect x="10" y="8" width="140" height="74" rx="3" />
      <rect x="40" y="14" width="80" height="34" fill={H} />
      <path d="M16 56h128M16 64h128M16 72h128" />
      <rect x="20" y="53" width="30" height="6" />
      <rect x="54" y="53" width="44" height="6" />
      <rect x="102" y="53" width="24" height="6" />
      <rect x="26" y="61" width="52" height="6" />
      <path d="M20 72q4-4 8 0t8 0t8 0t8 0t8 0t8 0" />
      <path d="M86 50v28" strokeWidth="2" />
    </>
  ),
  grade: (
    <>
      <rect x="10" y="8" width="140" height="48" rx="3" />
      <path d="M10 46q35-30 70-12t70-18" />
      <path d="M10 56h140" />
      <circle cx="40" cy="72" r="13" />
      <circle cx="80" cy="72" r="13" />
      <circle cx="120" cy="72" r="13" />
      <circle cx="44" cy="69" r="2.5" fill="currentColor" />
      <circle cx="77" cy="74" r="2.5" fill="currentColor" />
      <circle cx="123" cy="68" r="2.5" fill="currentColor" />
      <rect x="11" y="9" width="70" height="46" fill={H} stroke="none" />
    </>
  ),
  sound: (
    <>
      <path d="M6 45h148" strokeDasharray="2 4" />
      <path d="M6 45l6-8l4 16l5-24l5 32l6-38l5 40l5-30l6 22l5-14l6 8l6-20l5 30l5-36l6 40l5-28l6 18l5-10l6 6l6-14l5 18l5-8l6 4" />
      <path d="M120 70q0-12 12-12t12 12v10h-24z" />
      <path d="M118 70v6q14 8 28 0v-6" />
    </>
  ),
  files: (
    <>
      <rect x="24" y="14" width="56" height="34" rx="2" />
      <path d="M48 25l10 6l-10 6z" fill="currentColor" />
      <rect
        x="44"
        y="32"
        width="56"
        height="34"
        rx="2"
        fill="var(--r8-panel)"
      />
      <path d="M68 43l10 6l-10 6z" fill="currentColor" />
      <rect
        x="64"
        y="50"
        width="56"
        height="34"
        rx="2"
        fill="var(--r8-panel)"
      />
      <path d="M88 61l10 6l-10 6z" fill="currentColor" />
      <path d="M128 30h24M128 38h18M128 46h22" />
    </>
  ),
  phone: (
    <>
      <rect x="58" y="6" width="44" height="80" rx="6" />
      <path d="M74 12h12" />
      <rect x="62" y="18" width="36" height="24" fill={H} />
      <rect x="64" y="58" width="32" height="12" rx="6" />
      <path d="M72 64l4 3l7-6" strokeWidth="1.8" />
      <path d="M118 52q14 4 18 18M122 44q20 6 26 28" />
      <path d="M30 30l12 6M26 46h14M30 62l12-6" />
    </>
  ),
  screening: (
    <>
      <rect x="20" y="6" width="120" height="50" />
      <path d="M74 20l18 11l-18 11z" />
      <rect
        x="21"
        y="7"
        width="118"
        height="48"
        fill={H}
        stroke="none"
        opacity="0.4"
      />
      <circle cx="34" cy="74" r="7" />
      <circle cx="62" cy="72" r="7" />
      <circle cx="92" cy="74" r="7" />
      <circle cx="122" cy="72" r="7" />
      <path d="M22 90q12-12 24 0M50 90q12-12 24 0M80 90q12-12 24 0M110 90q12-12 24 0" />
    </>
  ),
};

// Κοινά defs: χειροποίητο τρέμουλο γραμμής και διαγράμμιση για σκιές.
export function SketchDefs() {
  return (
    <svg width="0" height="0" aria-hidden style={{ position: "absolute" }}>
      <defs>
        <filter id="r8-rough">
          <feTurbulence
            type="fractalNoise"
            baseFrequency="0.035"
            numOctaves="2"
            seed="3"
          />
          <feDisplacementMap in="SourceGraphic" scale="2.2" />
        </filter>
        <pattern
          id="r8-hatch"
          width="4"
          height="4"
          patternUnits="userSpaceOnUse"
          patternTransform="rotate(45)"
        >
          <path
            d="M0 0v4"
            stroke="currentColor"
            strokeWidth="0.6"
            opacity="0.55"
          />
        </pattern>
      </defs>
    </svg>
  );
}

interface PanelProps {
  sketch: SketchName;
  shot: string;
  note: string;
}

export function Panel({ sketch, shot, note }: PanelProps) {
  return (
    <figure className="r8-panel">
      <div className="r8-panel-frame">
        <span className="r8-shot">{shot}</span>
        <svg viewBox="0 0 160 90" aria-hidden>
          <g filter="url(#r8-rough)">{SKETCHES[sketch]}</g>
        </svg>
      </div>
      <figcaption>{note}</figcaption>
    </figure>
  );
}
