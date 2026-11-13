"use client";

import { useEffect, useState } from "react";

import type { VideoControl } from "@/spaces/kit/video-player";

import { formatTimecode } from "../timecode";

// Τα βοηθητικά της νέας σημείωσης και του «το είδε», κοινά για H2 και H4.

// «Το είδε»: μία φορά ανά Έκδοση που ανοίγει, μόνο όταν έχει σημειώσεις. Δεν φρεσκάρει την οθόνη.
export function useMarkSeen(
  markSeen: (deliverableId: string, versionNumber: number) => Promise<void>,
  deliverableId: string,
  versionNumber: number,
  hasNotes: boolean,
) {
  useEffect(() => {
    if (!hasNotes) return;
    markSeen(deliverableId, versionNumber).catch(() => {
      // Το «το είδε» δεν είναι κρίσιμο: αν δεν γραφτεί, ξαναγράφεται στο επόμενο άνοιγμα.
    });
  }, [markSeen, deliverableId, versionNumber, hasNotes]);
}

// Ο χρόνος της νέας σημείωσης: γράφεται με το χέρι ή παίρνεται από τον player («Χρόνος τώρα»).
export function TimeField({
  control,
  value,
  onChange,
  label,
}: {
  control?: VideoControl;
  value: string;
  onChange: (value: string) => void;
  label: string;
}) {
  const [hint, setHint] = useState<string | null>(null);
  const takeNow = () => {
    const now = control?.currentTime() ?? null;
    if (now === null) {
      setHint(
        "Ο χρόνος παίρνεται μόνο από βίντεο YouTube ή Vimeo που παίζει. Γράψε τον με το χέρι.",
      );
      return;
    }
    setHint(null);
    onChange(formatTimecode(Math.floor(now)));
  };
  return (
    <div className="vn-time-field">
      <label>
        {label}
        <input
          className="input"
          name="atSeconds"
          value={value}
          placeholder="0:12"
          autoComplete="off"
          onChange={(event) => onChange(event.target.value)}
        />
      </label>
      {control && (
        <button type="button" className="button" onClick={takeNow}>
          Χρόνος τώρα
        </button>
      )}
      {hint && <span className="muted">{hint}</span>}
    </div>
  );
}

// Μόλις αρχίσεις να γράφεις σημείωση, ο χρόνος παίρνεται από τον player (αν δεν έγραψες ήδη δικό σου).
export const fillTimeOnStart = (
  control: VideoControl | undefined,
  time: string,
  setTime: (value: string) => void,
) => {
  if (time.trim() !== "" || !control) return;
  const now = control.currentTime();
  if (now !== null) setTime(formatTimecode(Math.floor(now)));
};
