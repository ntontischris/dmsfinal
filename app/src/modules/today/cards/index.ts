import { CLIENT_CARDS } from "./client";
import { DECIDE_CARDS } from "./decide";
import { HEALTH_CARDS } from "./health";
import { MONEY_CARDS } from "./money";
import type { CardRenderer } from "./types";
import { WEEK_CARDS } from "./week";
import { WORK_CARDS } from "./work";

// Το μητρώο renderers της εφαρμογής: ένα αρχείο ανά ομάδα, ώστε τα κομμάτια Σβ–Σε να γράφουν μόνο στο δικό τους.
const RENDERERS: Readonly<Record<string, CardRenderer>> = {
  ...HEALTH_CARDS,
  ...DECIDE_CARDS,
  ...WORK_CARDS,
  ...MONEY_CARDS,
  ...WEEK_CARDS,
  ...CLIENT_CARDS,
};

export const rendererOf = (code: string): CardRenderer | undefined =>
  RENDERERS[code];

export type { CardRenderer, CardRenderers, CardViewProps } from "./types";
