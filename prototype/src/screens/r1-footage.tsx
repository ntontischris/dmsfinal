import { useId, type ReactNode } from "react";

import { Cafe, Shore, type BodyProps, type Tone } from "@/screens/r1-scenes-a";
import { Bakery, Harbour, Stage } from "@/screens/r1-scenes-b";

// Ένα «πλάνο» του program monitor: σκηνή σε SVG με βινιέτα και κόκκο.

export type SceneKind = "cafe" | "shore" | "harbour" | "stage" | "bakery";

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
}

export function FootageScene({ kind, hue }: FootageSceneProps) {
  const id = `s${useId().replace(/[^a-zA-Z0-9]/g, "")}`;
  const t: Tone = (l, c, h = hue, a = 1) => `oklch(${l}% ${c} ${h} / ${a})`;
  const Body = SCENES[kind];
  return (
    <svg
      className="r1s"
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
        className="r1s-grain"
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
