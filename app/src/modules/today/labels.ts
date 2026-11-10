import type { CardKind } from "./view-schema";

// Τα κείμενα της «Σήμερα» (A1), κατά το prototype.

export const TODAY_TITLE = "Σήμερα";
export const CUSTOMIZE_PATH = "/app?customize=1";

// Τι λέει μια άδεια κάρτα, ανά είδος.
export const EMPTY_TEXT: Readonly<Record<CardKind, string>> = {
  health: "Όλα λειτουργούν.",
  week: "Τίποτα αυτή την εβδομάδα.",
  action: "Τίποτα σε αναμονή.",
};
