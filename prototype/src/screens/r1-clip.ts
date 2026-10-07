import type { SceneKind } from "@/screens/r1-footage";

// R1: ένα κλιπ του timeline (σειριοποιήσιμο, περνά στο client component) και τα timecodes.

export interface Clip {
  id: string;
  code: string; // ετικέτα κλιπ, π.χ. A001_C012
  title: string;
  summary: string;
  kind: string;
  host: string;
  href: string;
  linkLabel: string;
  scene: SceneKind;
  hue: number;
  start: number; // % του timeline
  length: number;
}

export const TOTAL_SECONDS = 120;
const FPS = 25;
const pad = (n: number) => String(n).padStart(2, "0");

export const timecode = (pos: number): string => {
  const frames = Math.floor(pos * TOTAL_SECONDS * FPS);
  const s = Math.floor(frames / FPS);
  return `00:${pad(Math.floor(s / 60))}:${pad(s % 60)}:${pad(frames % FPS)}`;
};
