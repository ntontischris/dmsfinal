import type { CardKind } from "./view-schema";

// Τα κείμενα της «Σήμερα» (A1), κατά το prototype.

export const TODAY_TITLE = "Σήμερα";
export const TODAY_EYEBROW = "A1 · Σήμερα";
export const CUSTOMIZE_PATH = "/app?customize=1";
export const NOTIFICATIONS_PATH = "/app/notifications";

export const unreadLine = (count: number): string =>
  count === 1 ? "1 νέα Ειδοποίηση →" : `${count} νέες Ειδοποιήσεις →`;

// Τι λέει μια άδεια κάρτα, ανά είδος.
export const EMPTY_TEXT: Readonly<Record<CardKind, string>> = {
  health: "Όλα λειτουργούν.",
  week: "Τίποτα αυτή την εβδομάδα.",
  action: "Τίποτα σε αναμονή.",
};

export const CARD_FAILED_TEXT =
  "Η κάρτα δεν φόρτωσε. Οι υπόλοιπες δεν επηρεάζονται.";
export const RETRY_LABEL = "Ξαναδοκίμασε";
export const OPEN_LABEL = "Άνοιγμα →";
export const URGENT_LABEL = "επείγον";
