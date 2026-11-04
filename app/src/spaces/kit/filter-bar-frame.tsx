"use client";

import { useEffect, useRef, type ReactNode } from "react";

// Απόσταση της ανοιχτής λίστας από τις άκρες της οθόνης.
const GUTTER = 16;

// Η ανοιχτή λίστα μένει μέσα στην οθόνη: μετακινείται όσο χρειάζεται προς τα μέσα.
function keepInViewport(pop: HTMLElement) {
  pop.style.translate = "";
  const { left, right } = pop.getBoundingClientRect();
  const max = document.documentElement.clientWidth - GUTTER;
  const shift = Math.max(GUTTER - left, Math.min(0, max - right));
  pop.style.translate = shift === 0 ? "" : `${shift}px 0`;
}

const openCardsOf = (root: HTMLElement): HTMLDetailsElement[] => [
  ...root.querySelectorAll<HTMLDetailsElement>("details[open]"),
];

// Όταν ανοίγει κάρτα: η λίστα μέσα στην οθόνη και, με ποντίκι, ο κέρσορας στην αναζήτησή της.
function handleToggle(event: Event) {
  const card = event.target;
  if (!(card instanceof HTMLDetailsElement) || !card.open) return;
  const pop = card.querySelector<HTMLElement>(".kit-fb-pop");
  if (pop) keepInViewport(pop);
  if (window.matchMedia("(pointer: fine)").matches)
    card.querySelector<HTMLInputElement>("input[type='search']")?.focus();
}

// Η σειρά καρτών: κλείνει με κλικ έξω, με Escape και μόλις διαλέξεις επιλογή (η επιλογή είναι σύνδεσμος).
export function FilterBarFrame({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const root = ref.current;
    if (!root) return;
    const handlePointerDown = (event: PointerEvent) => {
      for (const card of openCardsOf(root))
        if (!card.contains(event.target as Node)) card.open = false;
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      for (const card of openCardsOf(root)) {
        card.open = false;
        card.querySelector("summary")?.focus();
      }
    };
    const handleClick = (event: MouseEvent) => {
      const link = (event.target as Element).closest(".kit-fb-pop a");
      const card = link?.closest("details");
      if (card) card.open = false;
    };
    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    root.addEventListener("click", handleClick);
    root.addEventListener("toggle", handleToggle, true);
    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
      root.removeEventListener("click", handleClick);
      root.removeEventListener("toggle", handleToggle, true);
    };
  }, []);
  return (
    <div className="kit-fb" role="group" aria-label={label} ref={ref}>
      {children}
    </div>
  );
}
