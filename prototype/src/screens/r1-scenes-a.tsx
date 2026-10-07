// R1: ζωγραφισμένα «πλάνα» σε SVG για το program monitor (από την πρόταση «1 Μοντάζ»).
// Σταθερά χρώματα: είναι εικόνα, όχι διεπαφή.

export const rand = (i: number) => {
  const x = Math.sin(i * 12.9898) * 43758.5453;
  // Στρογγυλεμένο: τα τελευταία δεκαδικά του Math.sin διαφέρουν server/browser (hydration).
  return Math.round((x - Math.floor(x)) * 1000) / 1000;
};

export type Tone = (l: number, c: number, h?: number, a?: number) => string;
export interface BodyProps {
  id: string;
  t: Tone;
  hue: number;
}

export function Grad({
  id,
  stops,
  y2 = "1",
}: {
  id: string;
  stops: readonly (readonly [number, string])[];
  y2?: string;
}) {
  return (
    <linearGradient id={id} x1="0" y1="0" x2="0" y2={y2}>
      {stops.map(([offset, color]) => (
        <stop key={offset} offset={offset} style={{ stopColor: color }} />
      ))}
    </linearGradient>
  );
}

export function Cafe({ id, t, hue }: BodyProps) {
  const bokeh = Array.from({ length: 16 }, (_, i) => ({
    x: 60 + rand(i) * 1480,
    y: 70 + rand(i + 40) * 470,
    r: 22 + rand(i + 80) * 70,
    o: 0.22 + rand(i + 120) * 0.45,
  }));
  const bulbs = Array.from({ length: 14 }, (_, i) => ({
    x: 20 + i * 120,
    y: Math.round(150 + Math.sin(i * 0.9) * 26 + (i % 2) * 14),
  }));
  return (
    <>
      <defs>
        <Grad
          id={`${id}-bg`}
          stops={[
            [0, t(13, 0.03)],
            [0.6, t(21, 0.06)],
            [1, t(27, 0.08)],
          ]}
        />
        <Grad
          id={`${id}-win`}
          stops={[
            [0, t(38, 0.09, 255)],
            [0.7, t(58, 0.1, 30)],
            [1, t(66, 0.12, 45)],
          ]}
        />
      </defs>
      <rect width="1600" height="900" fill={`url(#${id}-bg)`} />
      <rect
        x="860"
        y="100"
        width="640"
        height="520"
        fill={`url(#${id}-win)`}
        opacity="0.8"
      />
      <g fill={t(9, 0.02)}>
        <rect x="860" y="96" width="640" height="16" />
        <rect x="1066" y="100" width="16" height="520" />
        <rect x="1276" y="100" width="16" height="520" />
        <rect x="860" y="350" width="640" height="12" />
      </g>
      <g filter={`url(#${id}-blur)`}>
        {bokeh.map((b, i) => (
          <circle
            key={i}
            className="r1s-drift"
            style={{ animationDelay: `${-i * 0.7}s` }}
            cx={b.x}
            cy={b.y}
            r={b.r}
            fill={t(84, 0.14, hue + (i % 3) * 12)}
            opacity={b.o}
          />
        ))}
      </g>
      <path
        d={`M${bulbs.map((b) => `${b.x} ${b.y - 10}`).join(" L")}`}
        stroke={t(8, 0.01)}
        strokeWidth="2"
        fill="none"
      />
      {bulbs.map((b, i) => (
        <g
          key={i}
          className="r1s-shimmer"
          style={{ animationDelay: `${-i * 0.37}s` }}
        >
          <circle cx={b.x} cy={b.y} r="18" fill={t(90, 0.12, 80, 0.3)} />
          <circle cx={b.x} cy={b.y} r="5" fill={t(97, 0.06, 85)} />
        </g>
      ))}
      <path d="M0 702 L1600 656 L1600 900 L0 900Z" fill={t(8, 0.02)} />
      <path
        d="M0 702 L1600 656"
        stroke={t(74, 0.13, hue, 0.7)}
        strokeWidth="3"
      />
      <path
        d="M560 612 h150 v18 q0 56 -75 56 q-75 0 -75 -56z"
        fill={t(9, 0.02)}
      />
      <path
        d="M710 626 q42 0 42 24 q0 24 -42 24"
        stroke={t(9, 0.02)}
        strokeWidth="11"
        fill="none"
      />
      <path d="M560 616 h150" stroke={t(76, 0.13, hue, 0.8)} strokeWidth="3" />
      <g
        filter={`url(#${id}-blur)`}
        stroke={t(94, 0.02, hue, 0.3)}
        strokeWidth="9"
        fill="none"
        strokeLinecap="round"
      >
        <path className="r1s-steam" d="M615 590 q-24 -42 0 -84 q24 -42 0 -84" />
        <path
          className="r1s-steam"
          style={{ animationDelay: "-2s" }}
          d="M660 594 q22 -40 0 -80 q-22 -40 0 -80"
        />
      </g>
    </>
  );
}

export function Shore({ id, t, hue }: BodyProps) {
  return (
    <>
      <defs>
        <Grad
          id={`${id}-bg`}
          stops={[
            [0, t(28, 0.06)],
            [0.42, t(58, 0.07, hue + 25)],
            [0.6, t(82, 0.09, 62)],
            [1, t(80, 0.08, 45)],
          ]}
        />
        <Grad
          id={`${id}-sea`}
          stops={[
            [0, t(62, 0.06, hue + 15)],
            [0.35, t(36, 0.06)],
            [1, t(14, 0.04)],
          ]}
        />
        <radialGradient id={`${id}-sun`}>
          <stop offset="0" style={{ stopColor: t(94, 0.1, 75, 0.85) }} />
          <stop offset="1" style={{ stopColor: t(80, 0.1, 60, 0) }} />
        </radialGradient>
      </defs>
      <rect width="1600" height="900" fill={`url(#${id}-bg)`} />
      <circle cx="1120" cy="548" r="300" fill={`url(#${id}-sun)`} />
      <circle cx="1120" cy="548" r="44" fill={t(97, 0.06, 85)} />
      <path
        d="M0 562 L170 522 L330 540 L520 468 L700 528 L860 502 L1010 545 L1600 538 L1600 564 L0 564Z"
        fill={t(52, 0.04, hue, 0.75)}
      />
      <rect y="560" width="1600" height="340" fill={`url(#${id}-sea)`} />
      {Array.from({ length: 16 }, (_, i) => (
        <rect
          key={i}
          className="r1s-shimmer"
          style={{ animationDelay: `${-i * 0.29}s` }}
          x={1120 - (24 + i * 13 + rand(i) * 30) / 2}
          y={572 + i * 20}
          width={24 + i * 13 + rand(i) * 30}
          height="3"
          rx="1.5"
          fill={t(94, 0.08, 72, 0.75 - i * 0.04)}
        />
      ))}
      <g fill={t(9, 0.02)}>
        <path d="M100 900 L150 770 Q260 706 420 734 Q530 756 580 900Z" />
        <circle cx="330" cy="604" r="22" />
        <path d="M288 722 Q298 642 330 632 Q362 642 372 722 Q402 734 414 742 L246 742 Q258 734 288 722Z" />
      </g>
    </>
  );
}
