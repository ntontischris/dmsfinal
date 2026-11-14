"use client";

import { useSyncExternalStore } from "react";

import { parseCounts, type FilmingCounts } from "./flows";

// Η σελίδα του Γυρίσματος (E3) γράφει στο <div data-flow-filming> πόσα μέλη και αντικείμενα έχει, από τη βάση.
// Ο οδηγός τα διαβάζει ζωντανά: κάθε αλλαγή Συνεργείου/Εξοπλισμού ξαναζωγραφίζει τη σελίδα και ενημερώνει το div.
const SELECTOR = "[data-flow-filming]";

const subscribe = (onChange: () => void): (() => void) => {
  const observer = new MutationObserver(onChange);
  observer.observe(document.body, {
    subtree: true,
    childList: true,
    attributes: true,
    attributeFilter: ["data-crew", "data-equipment"],
  });
  return () => observer.disconnect();
};

const snapshot = (): string => {
  const node = document.querySelector(SELECTOR);
  return node instanceof HTMLElement
    ? `${node.dataset.crew ?? ""},${node.dataset.equipment ?? ""}`
    : "";
};

// null = δεν είμαστε στη σελίδα ενός Γυρίσματος (ή δεν δόθηκαν αριθμοί).
export function useFilmingCounts(): FilmingCounts | null {
  return parseCounts(useSyncExternalStore(subscribe, snapshot, () => ""));
}
