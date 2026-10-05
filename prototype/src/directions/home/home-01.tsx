"use client";

// Πρόταση 1 · Μοντάζ: η Αρχική ως αίθουσα μοντάζ. Program monitor με τον τίτλο,
// timeline με τις Δουλειές ως κλιπ, playhead που παίζει μόνο του και «σκρουμπάρει» με την κύλιση.
// Το FootageScene (ζωγραφισμένα «πλάνα» σε SVG) το χρησιμοποιεί και η πρόταση 2.

import { Inter_Tight, JetBrains_Mono } from "next/font/google";
import {
  useCallback,
  useEffect,
  useId,
  useRef,
  useState,
  type CSSProperties,
  type ReactNode,
} from "react";

import { CLIENT_LOGOS, SERVICES, WORKS } from "@/directions/content";

import "@/directions/home/home-01.css";

const sans = Inter_Tight({
  subsets: ["latin", "greek"],
  variable: "--h1-sans",
});
const mono = JetBrains_Mono({
  subsets: ["latin", "greek"],
  variable: "--h1-mono",
});

/* ---------- Πλάνα: σκηνές σε SVG με φως, βάθος και κόκκο ---------- */

export type SceneKind = "cafe" | "shore" | "harbour" | "stage" | "bakery";
export const SCENE_KINDS: readonly SceneKind[] = [
  "cafe",
  "shore",
  "harbour",
  "stage",
  "bakery",
];

const rand = (i: number) => {
  const x = Math.sin(i * 12.9898) * 43758.5453;
  // Στρογγυλεμένο: τα τελευταία δεκαδικά του Math.sin διαφέρουν server/browser (hydration).
  return Math.round((x - Math.floor(x)) * 1000) / 1000;
};

type Tone = (l: number, c: number, h?: number, a?: number) => string;
interface BodyProps {
  id: string;
  t: Tone;
  hue: number;
}

function Grad({
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

function Cafe({ id, t, hue }: BodyProps) {
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
            className="h1s-drift"
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
          className="h1s-shimmer"
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
        <path className="h1s-steam" d="M615 590 q-24 -42 0 -84 q24 -42 0 -84" />
        <path
          className="h1s-steam"
          style={{ animationDelay: "-2s" }}
          d="M660 594 q22 -40 0 -80 q-22 -40 0 -80"
        />
      </g>
    </>
  );
}

function Shore({ id, t, hue }: BodyProps) {
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
          className="h1s-shimmer"
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

const CONTAINER_HUES = [20, 200, 60, 140, 330, 95];

function Harbour({ id, t, hue }: BodyProps) {
  return (
    <>
      <defs>
        <Grad
          id={`${id}-bg`}
          stops={[
            [0, t(15, 0.06)],
            [0.45, t(30, 0.1)],
            [0.6, t(52, 0.1, hue + 25)],
            [0.68, t(74, 0.12, 55)],
            [1, t(20, 0.05)],
          ]}
        />
        <Grad
          id={`${id}-sea`}
          stops={[
            [0, t(30, 0.08)],
            [1, t(9, 0.03)],
          ]}
        />
      </defs>
      <rect width="1600" height="900" fill={`url(#${id}-bg)`} />
      {Array.from({ length: 70 }, (_, i) => (
        <circle
          key={i}
          cx={i * 23 + rand(i) * 18}
          cy={596 + rand(i + 9) * 9}
          r={1.2 + rand(i + 3) * 2}
          fill={t(90, 0.13, 80, 0.85)}
        />
      ))}
      <g stroke={t(8, 0.03)} fill="none" strokeLinecap="square">
        <path
          strokeWidth="9"
          d="M300 612 V220 M196 240 H650 M300 220 L470 240 M300 220 L228 240 M820 612 V300 M756 315 H1090 M820 300 L955 315"
        />
        <path
          strokeWidth="6"
          d="M256 612 L300 470 L344 612 M776 612 L820 500 L864 612"
        />
        <path strokeWidth="2.5" d="M586 240 V432 M1040 315 V470" />
      </g>
      <circle
        className="h1s-blink"
        cx="300"
        cy="211"
        r="7"
        fill={t(66, 0.23, 27)}
      />
      <circle
        className="h1s-blink"
        style={{ animationDelay: "-0.8s" }}
        cx="820"
        cy="291"
        r="7"
        fill={t(66, 0.23, 27)}
      />
      {Array.from({ length: 18 }, (_, i) => (
        <rect
          key={i}
          x={1060 + (i % 9) * 40}
          y={i < 9 ? 556 : 578}
          width="38"
          height="20"
          fill={t(36, 0.09, CONTAINER_HUES[i % 6])}
        />
      ))}
      <path d="M1000 598 L1540 598 L1500 652 L1030 652Z" fill={t(8, 0.02)} />
      <rect x="1430" y="512" width="70" height="86" fill={t(9, 0.02)} />
      {[0, 1, 2].map((i) => (
        <rect
          key={i}
          x={1440 + i * 20}
          y="526"
          width="12"
          height="7"
          fill={t(92, 0.12, 82)}
        />
      ))}
      <rect y="612" width="1600" height="288" fill={`url(#${id}-sea)`} />
      <g filter={`url(#${id}-blur)`}>
        {Array.from({ length: 22 }, (_, i) => (
          <rect
            key={i}
            className="h1s-shimmer"
            style={{ animationDelay: `${-i * 0.41}s` }}
            x={i * 73 + rand(i) * 30}
            y="620"
            width="5"
            height={60 + rand(i + 5) * 140}
            fill={t(85, 0.12, 75, 0.45)}
          />
        ))}
      </g>
    </>
  );
}

const CROWD = (() => {
  let d = "M0 900 L0 800";
  const arms: string[] = [];
  for (let i = 0; i < 41; i++) {
    const x = i * 40;
    const h = 770 + rand(i + 7) * 40;
    d += ` L${x} ${h + 30} Q${x + 4} ${h - 8} ${x + 20} ${h - 10} Q${x + 36} ${h - 8} ${x + 40} ${h + 30}`;
    if (rand(i + 31) > 0.7)
      arms.push(
        `M${x + 12} ${h + 34} L${x + 12 + (rand(i + 2) - 0.5) * 50} ${h - 92}`,
      );
  }
  return { body: `${d} L1600 900Z`, arms: arms.join(" ") };
})();

function Stage({ id, t, hue }: BodyProps) {
  return (
    <>
      <defs>
        <Grad
          id={`${id}-bg`}
          stops={[
            [0, t(6, 0.02)],
            [0.7, t(16, 0.08)],
            [1, t(24, 0.12)],
          ]}
        />
        <Grad
          id={`${id}-beam`}
          stops={[
            [0, t(96, 0.08, hue + 35, 0.75)],
            [1, t(70, 0.17, hue, 0)],
          ]}
        />
      </defs>
      <rect width="1600" height="900" fill={`url(#${id}-bg)`} />
      <ellipse
        cx="800"
        cy="540"
        rx="780"
        ry="270"
        fill={t(48, 0.15, hue, 0.38)}
        filter={`url(#${id}-soft)`}
      />
      {[180, 500, 800, 1100, 1420].map((x, i) => (
        <polygon
          key={x}
          className="h1s-sway"
          style={{
            transformOrigin: `${x}px 0px`,
            animationDelay: `${-i * 1.3}s`,
            mixBlendMode: "screen",
          }}
          points={`${x - 14},0 ${x + 14},0 ${x + 250},900 ${x - 250},900`}
          fill={`url(#${id}-beam)`}
        />
      ))}
      {[180, 500, 800, 1100, 1420].map((x) => (
        <g key={x}>
          <circle
            cx={x}
            cy="18"
            r="56"
            fill={t(92, 0.1, hue + 35, 0.35)}
            filter={`url(#${id}-blur)`}
          />
          <circle cx={x} cy="18" r="16" fill={t(98, 0.04, hue + 35)} />
        </g>
      ))}
      <path d={CROWD.body} fill={t(5, 0.01)} />
      <path
        d={CROWD.arms}
        stroke={t(5, 0.01)}
        strokeWidth="13"
        strokeLinecap="round"
      />
    </>
  );
}

function Bakery({ id, t, hue }: BodyProps) {
  return (
    <>
      <defs>
        <Grad
          id={`${id}-bg`}
          stops={[
            [0, t(17, 0.04)],
            [0.65, t(29, 0.07)],
            [1, t(19, 0.05)],
          ]}
        />
        <Grad
          id={`${id}-shaft`}
          stops={[
            [0, t(96, 0.08, 85, 0.5)],
            [1, t(86, 0.1, 80, 0)],
          ]}
        />
      </defs>
      <rect width="1600" height="900" fill={`url(#${id}-bg)`} />
      <rect
        x="1040"
        y="40"
        width="480"
        height="560"
        fill={t(90, 0.11, 80, 0.55)}
        filter={`url(#${id}-soft)`}
      />
      <rect x="1080" y="70" width="400" height="500" fill={t(97, 0.05, 88)} />
      <g fill={t(14, 0.03)}>
        <rect x="1272" y="70" width="14" height="500" />
        <rect x="1080" y="312" width="400" height="12" />
      </g>
      <polygon
        points="1080,90 1480,90 980,900 260,900"
        fill={`url(#${id}-shaft)`}
        style={{ mixBlendMode: "screen" }}
      />
      {Array.from({ length: 26 }, (_, i) => (
        <circle
          key={i}
          className="h1s-drift"
          style={{ animationDelay: `${-i * 0.6}s` }}
          cx={420 + rand(i) * 900}
          cy={180 + rand(i + 50) * 600}
          r={1.4 + rand(i + 9) * 2.4}
          fill={t(96, 0.05, 85, 0.75)}
        />
      ))}
      <path d="M500 0 V176" stroke={t(10, 0.02)} strokeWidth="3" />
      <circle
        cx="500"
        cy="236"
        r="70"
        fill={t(90, 0.12, 80, 0.4)}
        filter={`url(#${id}-soft)`}
      />
      <path d="M426 232 Q500 160 574 232Z" fill={t(10, 0.02)} />
      <circle cx="500" cy="238" r="9" fill={t(98, 0.05, 85)} />
      <path d="M0 722 L1600 700 L1600 900 L0 900Z" fill={t(11, 0.03)} />
      <path
        d="M0 722 L1600 700"
        stroke={t(76, 0.12, hue, 0.6)}
        strokeWidth="3"
      />
      {[380, 540, 700].map((x, i) => (
        <g key={x}>
          <ellipse
            cx={x}
            cy={700 - i * 3}
            rx="74"
            ry="30"
            fill={t(50, 0.13, 58)}
          />
          <ellipse
            cx={x + 6}
            cy={688 - i * 3}
            rx="52"
            ry="11"
            fill={t(80, 0.12, 75, 0.55)}
          />
          <path
            d={`M${x - 30} ${694 - i * 3} l18 -14 M${x - 4} ${694 - i * 3} l18 -14 M${x + 22} ${694 - i * 3} l18 -14`}
            stroke={t(30, 0.08, 50)}
            strokeWidth="4"
          />
        </g>
      ))}
    </>
  );
}

const SCENES: Record<SceneKind, (props: BodyProps) => ReactNode> = {
  cafe: Cafe,
  shore: Shore,
  harbour: Harbour,
  stage: Stage,
  bakery: Bakery,
};

interface FootageSceneProps {
  kind: SceneKind;
  hue: number;
  className?: string;
}

export function FootageScene({ kind, hue, className = "" }: FootageSceneProps) {
  const id = `s${useId().replace(/[^a-zA-Z0-9]/g, "")}`;
  const t: Tone = (l, c, h = hue, a = 1) => `oklch(${l}% ${c} ${h} / ${a})`;
  const Body = SCENES[kind];
  return (
    <svg
      className={`h1s ${className}`}
      viewBox="0 0 1600 900"
      preserveAspectRatio="xMidYMid slice"
      aria-hidden="true"
    >
      <defs>
        <radialGradient id={`${id}-vig`} cx="50%" cy="50%" r="75%">
          <stop offset="0.55" style={{ stopColor: "oklch(0% 0 0 / 0)" }} />
          <stop offset="1" style={{ stopColor: "oklch(0% 0 0 / 0.8)" }} />
        </radialGradient>
        <filter id={`${id}-blur`} x="-30%" y="-30%" width="160%" height="160%">
          <feGaussianBlur stdDeviation="9" />
        </filter>
        <filter id={`${id}-soft`} x="-30%" y="-30%" width="160%" height="160%">
          <feGaussianBlur stdDeviation="30" />
        </filter>
        <filter id={`${id}-grain`}>
          <feTurbulence
            type="fractalNoise"
            baseFrequency="0.9"
            numOctaves="2"
            stitchTiles="stitch"
          />
          <feColorMatrix type="saturate" values="0" />
        </filter>
      </defs>
      <Body id={id} t={t} hue={hue} />
      <rect
        className="h1s-grain"
        x="-40"
        y="-40"
        width="1680"
        height="980"
        filter={`url(#${id}-grain)`}
      />
      <rect width="1600" height="900" fill={`url(#${id}-vig)`} />
    </svg>
  );
}

/* ---------- Η Αρχική ---------- */

const NAV = ["Δουλειές", "Τομείς", "Τιμές", "Σχετικά", "Επικοινωνία"];
const STARTS = [0, 19, 36, 63, 81];
const LENGTHS = [18, 16, 26, 17, 19];
const CLIPS = WORKS.map((work, i) => ({
  work,
  start: STARTS[i],
  length: LENGTHS[i],
  code: `A00${i + 1}_C0${12 + i * 7}`,
}));
const TOTAL_SECONDS = 120;
const FPS = 25;
const pad = (n: number) => String(n).padStart(2, "0");

const timecode = (pos: number) => {
  const frames = Math.floor(pos * TOTAL_SECONDS * FPS);
  const s = Math.floor(frames / FPS);
  return `00:${pad(Math.floor(s / 60))}:${pad(s % 60)}:${pad(frames % FPS)}`;
};
const clipAt = (pos: number) =>
  CLIPS.reduce((found, clip, i) => (pos * 100 >= clip.start ? i : found), 0);

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
const VOICE = WAVE(7, 300);

function Lane({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="h1-row">
      <span className="h1-label">{label}</span>
      <div className="h1-lane">{children}</div>
    </div>
  );
}

export function Home01() {
  const suiteRef = useRef<HTMLElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const tcRef = useRef<HTMLSpanElement>(null);
  const posRef = useRef(0);
  const [active, setActive] = useState(0);
  const [hovered, setHovered] = useState<number | null>(null);
  const [playing, setPlaying] = useState(false);

  const apply = useCallback((pos: number) => {
    posRef.current = pos;
    stageRef.current?.style.setProperty("--pos", String(pos));
    if (tcRef.current) tcRef.current.textContent = timecode(pos);
    setActive(clipAt(pos));
  }, []);

  useEffect(() => {
    if (!window.matchMedia("(prefers-reduced-motion: reduce)").matches)
      setPlaying(true);
  }, []);

  useEffect(() => {
    if (!playing) return;
    let last = performance.now();
    let frame = 0;
    const tick = (now: number) => {
      apply((posRef.current + (now - last) / 45000) % 1);
      last = now;
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [playing, apply]);

  useEffect(() => {
    const handleScroll = () => {
      const rect = suiteRef.current?.getBoundingClientRect();
      const range = rect ? rect.height - window.innerHeight : 0;
      if (
        !rect ||
        range <= 0 ||
        rect.bottom < 0 ||
        rect.top > window.innerHeight
      )
        return;
      setPlaying(false);
      apply(Math.min(0.999, Math.max(0, -rect.top / range)));
    };
    document.addEventListener("scroll", handleScroll, {
      capture: true,
      passive: true,
    });
    return () =>
      document.removeEventListener("scroll", handleScroll, { capture: true });
  }, [apply]);

  const jumpTo = (index: number) => {
    setPlaying(false);
    apply((CLIPS[index].start + 0.5) / 100);
  };
  const shown = hovered ?? active;
  const clip = CLIPS[shown];

  return (
    <div className={`h1 ${sans.variable} ${mono.variable}`}>
      <header className="h1-bar">
        <a className="h1-logo" href="#">
          <i aria-hidden />
          DEVRE <b>MEDIA</b>
        </a>
        <nav aria-label="Κύριο μενού">
          {NAV.map((item) => (
            <a key={item} href="#">
              {item}
            </a>
          ))}
        </nav>
        <span className="h1-meta">Θεσσαλονίκη · 25 fps</span>
        <a className="h1-login" href="#">
          Είσοδος
        </a>
      </header>

      <section ref={suiteRef} className="h1-suite" aria-label="Showreel">
        <div
          ref={stageRef}
          className="h1-stage"
          style={{ "--pos": 0 } as CSSProperties}
        >
          <div className="h1-viewer">
            <aside className="h1-inspector">
              <p className="h1-panel-head">
                <span>Πληροφορίες κλιπ</span>
                <span>
                  {shown + 1}/{CLIPS.length}
                </span>
              </p>
              <p className="h1-code">{clip.code}</p>
              <h2>{clip.work.title}</h2>
              <dl>
                <dt>Πελάτης</dt>
                <dd>{clip.work.client}</dd>
                <dt>Είδος</dt>
                <dd>{clip.work.kind}</dd>
                <dt>Διάρκεια</dt>
                <dd>{clip.work.duration}</dd>
                <dt>In</dt>
                <dd>{timecode(clip.start / 100)}</dd>
                <dt>Out</dt>
                <dd>{timecode((clip.start + clip.length) / 100)}</dd>
              </dl>
              <p className="h1-pitch">
                Παραγωγή βίντεο για εταιρείες, από τη Θεσσαλονίκη. Σενάριο,
                γύρισμα, μοντάζ, και κάθε Παραδοτέο το βλέπετε και το εγκρίνετε
                από τον λογαριασμό σας.
              </p>
            </aside>

            <div className="h1-program">
              <p className="h1-panel-head">
                <span>Program · Devre_Showreel</span>
                <span className="h1-tally" data-on={playing}>
                  {playing ? "● Αναπαραγωγή" : "❚❚ Παύση"}
                </span>
              </p>
              <div className="h1-monitor-wrap">
                <div className="h1-monitor">
                  {CLIPS.map((item, i) => (
                    <div
                      key={item.code}
                      className="h1-shot"
                      data-active={i === shown}
                    >
                      <FootageScene kind={SCENE_KINDS[i]} hue={item.work.hue} />
                    </div>
                  ))}
                  <div className="h1-safe" aria-hidden />
                  <span className="h1-osd h1-osd-l">{clip.code}</span>
                  <span className="h1-osd h1-osd-r">4K · 25p · Rec.709</span>
                  <div className="h1-title">
                    <p>Devre Media · Παραγωγή βίντεο</p>
                    <h1>Κόβουμε ό,τι περισσεύει. Κρατάμε την ιστορία.</h1>
                  </div>
                  <p className="h1-caption">
                    {clip.work.title} · {clip.work.client}
                  </p>
                </div>
              </div>
              <div className="h1-transport">
                <span ref={tcRef} className="h1-tc">
                  00:00:00:00
                </span>
                <div className="h1-buttons">
                  <button
                    type="button"
                    aria-label="Αρχή"
                    onClick={() => jumpTo(0)}
                  >
                    ⏮
                  </button>
                  <button
                    type="button"
                    aria-label={playing ? "Παύση" : "Αναπαραγωγή"}
                    onClick={() => setPlaying((on) => !on)}
                  >
                    {playing ? "❚❚" : "▶"}
                  </button>
                  <button
                    type="button"
                    aria-label="Επόμενο κλιπ"
                    onClick={() => jumpTo((active + 1) % CLIPS.length)}
                  >
                    ⏭
                  </button>
                </div>
                <a className="h1-export" href="#">
                  Εξαγωγή <span>→ Ζήτα προσφορά</span>
                </a>
              </div>
            </div>
          </div>

          <div className="h1-timeline">
            <p className="h1-panel-head">
              <span>Timeline · Επιλεγμένες Δουλειές</span>
              <span>Κύλισε, πάτα ένα κλιπ ή ▶</span>
            </p>
            <div className="h1-tracks">
              <Lane label="TC">
                {Array.from({ length: 41 }, (_, i) => (
                  <span
                    key={i}
                    className="h1-tick"
                    data-major={i % 4 === 0}
                    style={{ left: `${i * 2.5}%` }}
                  >
                    {i % 8 === 0 && i < 40 ? timecode(i / 40).slice(3, 8) : ""}
                  </span>
                ))}
              </Lane>
              <Lane label="V2">
                {[
                  ["Τίτλος", 2, 11],
                  ["Lower third", 40, 13],
                  ["Λογότυπο", 85, 11],
                ].map(([name, start, length]) => (
                  <span
                    key={name}
                    className="h1-clip h1-clip-title"
                    style={{ left: `${start}%`, width: `${length}%` }}
                  >
                    {name}
                  </span>
                ))}
              </Lane>
              <Lane label="V1">
                {CLIPS.map((item, i) => (
                  <button
                    key={item.code}
                    type="button"
                    className="h1-clip h1-clip-video"
                    data-active={i === shown}
                    style={
                      {
                        left: `${item.start}%`,
                        width: `${item.length}%`,
                        "--hue": item.work.hue,
                      } as CSSProperties
                    }
                    onMouseEnter={() => setHovered(i)}
                    onMouseLeave={() => setHovered(null)}
                    onFocus={() => setHovered(i)}
                    onBlur={() => setHovered(null)}
                    onClick={() => jumpTo(i)}
                  >
                    <b>{item.work.title}</b>
                    <small>{item.code}</small>
                  </button>
                ))}
              </Lane>
              <Lane label="A1">
                <span
                  className="h1-clip h1-clip-audio"
                  style={{ left: "0%", width: "100%" }}
                >
                  <svg
                    viewBox="0 0 1000 40"
                    preserveAspectRatio="none"
                    aria-hidden
                  >
                    <path d={MUSIC} />
                  </svg>
                  <small>Μουσική</small>
                </span>
              </Lane>
              <Lane label="A2">
                {[
                  [4, 14],
                  [38, 20],
                  [66, 12],
                ].map(([start, length]) => (
                  <span
                    key={start}
                    className="h1-clip h1-clip-audio h1-clip-voice"
                    style={{ left: `${start}%`, width: `${length}%` }}
                  >
                    <svg
                      viewBox="0 0 300 40"
                      preserveAspectRatio="none"
                      aria-hidden
                    >
                      <path d={VOICE} />
                    </svg>
                    <small>Αφήγηση</small>
                  </span>
                ))}
              </Lane>
              <div className="h1-ph-layer" aria-hidden>
                <i className="h1-playhead" />
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="h1-section">
        <header className="h1-sec-head">
          <span>Bins</span>
          <h2>Τομείς</h2>
          <p>Κάθε δουλειά ξεκινά από έναν φάκελο. Διαλέξτε από πού ξεκινάμε.</p>
        </header>
        <ul className="h1-bins">
          {SERVICES.map((service, i) => (
            <li key={service.title}>
              <a href="#">
                <svg viewBox="0 0 24 20" aria-hidden>
                  <path d="M1 3 h8 l2 2.5 h12 v13.5 h-22z" />
                </svg>
                <span className="h1-bin-code">BIN_0{i + 1}</span>
                <strong>{service.title}</strong>
                <span className="h1-bin-line">{service.line}</span>
                <span className="h1-bin-go" aria-hidden>
                  →
                </span>
              </a>
            </li>
          ))}
        </ul>
      </section>

      <section className="h1-section">
        <header className="h1-sec-head">
          <span>Πηγές</span>
          <h2>Μας εμπιστεύτηκαν</h2>
        </header>
        <ul className="h1-sources">
          {CLIENT_LOGOS.map((name, i) => (
            <li key={name}>
              <small>SRC_{pad(i + 1)}</small>
              {name}
            </li>
          ))}
        </ul>
      </section>

      <section className="h1-section h1-queue">
        <p className="h1-panel-head">
          <span>Ουρά εξαγωγής</span>
          <span>1 εργασία</span>
        </p>
        <div className="h1-job">
          <span className="h1-job-name">Το_δικό_σας_βίντεο.mp4</span>
          <span className="h1-job-spec">H.264 · 3840×2160 · 25p</span>
          <span className="h1-progress" aria-hidden>
            <i />
          </span>
          <span className="h1-job-state">Σε αναμονή για το σενάριό σας</span>
        </div>
        <h2>Το επόμενο κλιπ στο timeline είναι το δικό σας.</h2>
        <a className="h1-export h1-export-lg" href="#">
          Ζήτα προσφορά <span>→</span>
        </a>
        <p className="h1-note">
          Μας λέτε τι χρειάζεστε στη φόρμα ενδιαφέροντος, σας απαντάμε με
          πρόταση.
        </p>
      </section>

      <footer className="h1-foot">
        <span>© Devre Media · Θεσσαλονίκη</span>
        <nav aria-label="Υποσέλιδο">
          <a href="#">Απόρρητο</a>
          <a href="#">Όροι</a>
          <a href="#">Είσοδος</a>
        </nav>
        <span>EOF · 00:02:00:00</span>
      </footer>
    </div>
  );
}
