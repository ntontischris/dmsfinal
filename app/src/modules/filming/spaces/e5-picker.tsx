"use client";

import {
  bookingHintOf,
  dayLabel,
  legendOf,
  type DayGroup,
  type DayView,
} from "./e5-model";

// Το πλέγμα ημερών της κράτησης (prototype `screens/e5-booking.tsx`): μήνες, υπόμνημα γκρι ημερών, πρώτη ελεύθερη.

export function DayPicker({
  groups,
  date,
  isBusy,
  onPick,
}: {
  groups: readonly DayGroup[];
  date: string | null;
  isBusy: boolean;
  onPick: (date: string) => void;
}) {
  return (
    <>
      {groups.map((group) => (
        <div key={group.month}>
          <h3>{group.month}</h3>
          <div className="e-days">
            {group.days.map(({ date: day, status }) => (
              <button
                key={day}
                id={`e-day-${day}`}
                type="button"
                className="button e-day"
                title={status.kind === "blocked" ? status.why : undefined}
                aria-pressed={date === day}
                disabled={status.kind === "blocked" || isBusy}
                onClick={() => onPick(day)}
              >
                <span>{dayLabel(day)}</span>
                <small>
                  {status.kind === "blocked" ? status.reason : "ελεύθερη"}
                </small>
              </button>
            ))}
          </div>
        </div>
      ))}
    </>
  );
}

// Ανοιχτό από την αρχή: ο πελάτης δεν ψάχνει γιατί οι μέρες είναι γκρι.
export function Legend({ days }: { days: readonly DayView[] }) {
  const reasons = legendOf(days);
  if (reasons.size === 0) return null;
  return (
    <details className="e-legend" open>
      <summary>Γιατί κάποιες μέρες είναι γκρι;</summary>
      <dl>
        {[...reasons].map(([reason, why]) => (
          <div key={reason}>
            <dt>{reason}</dt>
            <dd>{why}</dd>
          </div>
        ))}
      </dl>
    </details>
  );
}

// Όταν οι πρώτες μέρες είναι όλες γκρι, λέμε γιατί και πάμε τον πελάτη στην πρώτη ελεύθερη.
export function FirstFreeHint({ days }: { days: readonly DayView[] }) {
  const hint = bookingHintOf(days);
  if (!hint) return null;
  const jump = () => {
    const target = document.getElementById(`e-day-${hint.firstFree}`);
    target?.scrollIntoView({ behavior: "smooth", block: "center" });
    target?.focus({ preventScroll: true });
  };
  return (
    <div className="e-ok" role="status">
      <p>
        {hint.why} Η πρώτη ελεύθερη μέρα είναι η{" "}
        <strong>{dayLabel(hint.firstFree)}</strong>.
      </p>
      <button
        type="button"
        className="button"
        data-primary="true"
        onClick={jump}
      >
        Πήγαινε στην {dayLabel(hint.firstFree)}
      </button>
    </div>
  );
}

const STEPS = ["Μέρα", "Διάρκεια", "Ώρα", "Επιβεβαίωση"] as const;

export function Steps({ step }: { step: number }) {
  return (
    <ol className="e-steps" aria-label={`Βήμα ${step} από ${STEPS.length}`}>
      {STEPS.map((label, index) => (
        <li
          key={label}
          aria-current={index + 1 === step ? "step" : undefined}
          data-done={index + 1 < step}
        >
          <span>{index + 1}</span> {label}
        </li>
      ))}
    </ol>
  );
}
