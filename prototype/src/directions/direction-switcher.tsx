"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";

import { DIRECTIONS, type Direction } from "@/directions/directions";

interface DirectionSwitcherProps {
  current: Direction;
}

const isTyping = (target: EventTarget | null): boolean =>
  target instanceof HTMLElement &&
  (target.isContentEditable ||
    ["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName));

// Η μπάρα του prototype, όχι μέρος του design που κρίνεται. ← / → αλλάζουν κατεύθυνση.
export function DirectionSwitcher({ current }: DirectionSwitcherProps) {
  const router = useRouter();
  const pathname = usePathname();
  const index = DIRECTIONS.findIndex(
    (direction) => direction.key === current.key,
  );

  const go = (step: number) => {
    const next =
      DIRECTIONS[(index + step + DIRECTIONS.length) % DIRECTIONS.length];
    router.replace(`${pathname}?variant=${next.key}`, { scroll: false });
  };

  useEffect(() => {
    const handleKey = (event: KeyboardEvent) => {
      if (isTyping(event.target)) return;
      if (event.key === "ArrowLeft") go(-1);
      if (event.key === "ArrowRight") go(1);
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  });

  return (
    <div className="direction-switcher" role="group" aria-label="Κατεύθυνση">
      <button
        type="button"
        onClick={() => go(-1)}
        aria-label="Προηγούμενη κατεύθυνση"
      >
        ←
      </button>
      <div>
        <strong>
          {current.key.toUpperCase()} · {current.name}
        </strong>
        <small>{current.traits}</small>
      </div>
      <button
        type="button"
        onClick={() => go(1)}
        aria-label="Επόμενη κατεύθυνση"
      >
        →
      </button>
    </div>
  );
}
