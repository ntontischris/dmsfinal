"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect } from "react";

export interface SwitcherOption {
  key: string;
  name: string;
  traits: string;
}

interface DirectionSwitcherProps {
  options: readonly SwitcherOption[];
  current: SwitcherOption;
  canGoFull?: boolean;
}

const isTyping = (target: EventTarget | null): boolean =>
  target instanceof HTMLElement &&
  (target.isContentEditable ||
    ["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName));

// Η μπάρα του prototype, όχι μέρος του design που κρίνεται.
// ← / → αλλάζουν πρόταση, F ανοίγει/κλείνει την πλήρη οθόνη.
export function DirectionSwitcher({
  options,
  current,
  canGoFull,
}: DirectionSwitcherProps) {
  const router = useRouter();
  const pathname = usePathname();
  const isFull = useSearchParams().get("full") === "1";
  const index = options.findIndex((option) => option.key === current.key);

  const navigate = (key: string, full: boolean) =>
    router.replace(`${pathname}?variant=${key}${full ? "&full=1" : ""}`, {
      scroll: false,
    });

  const go = (step: number) =>
    navigate(
      options[(index + step + options.length) % options.length].key,
      isFull,
    );

  useEffect(() => {
    const handleKey = (event: KeyboardEvent) => {
      if (isTyping(event.target)) return;
      if (event.key === "ArrowLeft") go(-1);
      if (event.key === "ArrowRight") go(1);
      if (canGoFull && event.key.toLowerCase() === "f")
        navigate(current.key, !isFull);
      if (canGoFull && event.key === "Escape" && isFull)
        navigate(current.key, false);
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  });

  return (
    <div className="direction-switcher" role="group" aria-label="Πρόταση">
      <button
        type="button"
        onClick={() => go(-1)}
        aria-label="Προηγούμενη πρόταση"
      >
        ←
      </button>
      <div>
        <strong>
          {index + 1}/{options.length} · {current.name}
        </strong>
        <small>{current.traits}</small>
      </div>
      <button type="button" onClick={() => go(1)} aria-label="Επόμενη πρόταση">
        →
      </button>
      {canGoFull && (
        <button
          type="button"
          onClick={() => navigate(current.key, !isFull)}
          aria-label={isFull ? "Έξοδος από πλήρη οθόνη" : "Πλήρης οθόνη"}
          title="Πλήρης οθόνη (F)"
        >
          {isFull ? "✕" : "⤢"}
        </button>
      )}
    </div>
  );
}
