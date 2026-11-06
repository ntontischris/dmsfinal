"use client";

import type { MouseEvent } from "react";

import type { ClosedDay } from "@/lib/form-state";

import { CONFIRM_CLOSED_DAY, closedDayText, moveLabel } from "../closed-day";

// Η ημερομηνία του Επόμενου βήματος πέφτει σε κλειστή μέρα: μετακίνηση στην επόμενη ανοιχτή ή «κράτα το».
// Και τα δύο κουμπιά ξαναστέλνουν την ίδια φόρμα· η μετακίνηση αλλάζει πρώτα το πεδίο ημερομηνίας.
export function ClosedDayChoice({
  closedDay,
  isPending,
}: {
  closedDay: ClosedDay;
  isPending: boolean;
}) {
  const { nextOpen } = closedDay;
  const moveTo = (event: MouseEvent<HTMLButtonElement>) => {
    const due = event.currentTarget.form?.elements.namedItem("nextStepDue");
    if (nextOpen && due instanceof HTMLInputElement) due.value = nextOpen;
  };
  return (
    <div className="note" role="status">
      <p>{closedDayText(closedDay)}</p>
      <span className="btn-row">
        {nextOpen && (
          <button
            type="submit"
            className="button"
            data-primary="true"
            disabled={isPending}
            onClick={moveTo}
          >
            {moveLabel(nextOpen)}
          </button>
        )}
        <button
          type="submit"
          className="button"
          name={CONFIRM_CLOSED_DAY}
          value="1"
          disabled={isPending}
        >
          Κράτα το όπως είναι
        </button>
      </span>
    </div>
  );
}
