"use client";

import {
  useId,
  useRef,
  useState,
  type MouseEvent,
  type ToggleEvent,
} from "react";

import type { GlossaryEntry } from "@/spaces/data/glossary";

interface StatusHelpProps {
  label: string;
  entries: readonly GlossaryEntry[];
}

// Το μικρό «τι σημαίνει;» δίπλα σε σήμα κατάστασης: ανοίγει μια φούσκα με την εξήγηση του όρου.
// Native popover: δεν κόβεται από πίνακες με κύλιση και κλείνει με κλικ έξω ή Escape.
export function StatusHelp({ label, entries }: StatusHelpProps) {
  const id = useId();
  const buttonRef = useRef<HTMLButtonElement>(null);
  const [place, setPlace] = useState<{ top: number; left: number } | null>(
    null,
  );

  // Η φούσκα μπαίνει κάτω από το κουμπί, μέσα στα όρια της οθόνης.
  const handleToggle = (event: ToggleEvent<HTMLSpanElement>) => {
    if (event.newState !== "open" || !buttonRef.current) return;
    const box = buttonRef.current.getBoundingClientRect();
    const width = Math.min(288, window.innerWidth - 32);
    setPlace({
      top: box.bottom + 6,
      left: Math.max(16, Math.min(box.left, window.innerWidth - width - 16)),
    });
  };

  // Το σήμα μπορεί να ζει μέσα σε σύνδεσμο: το κλικ εδώ δεν ανοίγει τον σύνδεσμο. Το κουμπί κρατά
  // τη δική του ενέργεια (ανοίγει τη φούσκα)· η φούσκα ακυρώνει και την ενέργεια του συνδέσμου.
  const handleButtonClick = (event: MouseEvent<HTMLButtonElement>) =>
    event.stopPropagation();
  const handleClick = (event: MouseEvent<HTMLSpanElement>) => {
    event.preventDefault();
    event.stopPropagation();
  };

  // Μόνο inline στοιχεία: το σήμα μπορεί να βρίσκεται μέσα σε παράγραφο ή σύνδεσμο.
  return (
    <>
      <button
        ref={buttonRef}
        type="button"
        className="status-help-button"
        popoverTarget={id}
        aria-label={`Τι σημαίνει «${label}»;`}
        title="Τι σημαίνει;"
        onClick={handleButtonClick}
      >
        ?
      </button>
      <span
        id={id}
        popover="auto"
        className="status-help"
        onToggle={handleToggle}
        onClick={handleClick}
        style={place ?? undefined}
      >
        <span className="status-help-title">Τι σημαίνει;</span>
        {entries.map((entry) => (
          <span key={entry.term} className="status-help-entry">
            <strong>{entry.term}</strong>
            <span>{entry.meaning}</span>
          </span>
        ))}
      </span>
    </>
  );
}
