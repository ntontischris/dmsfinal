"use client";

import { useState } from "react";

import { athensFromInput, athensInputOf, laterOptions } from "./athens-time";

interface LaterMenuProps {
  keys: readonly string[];
  label: string;
  now: number;
  postpone: (rowKeys: readonly string[], until: number) => void;
}

// «Διαλέγω μέρα και ώρα»: οι περασμένες ώρες είναι κλειστές (min = τώρα, ζώνη Ελλάδας).
function PickTime({ keys, now, postpone }: Omit<LaterMenuProps, "label">) {
  const [value, setValue] = useState("");
  const until = athensFromInput(value);
  const isValid = until !== null && until > now;
  return (
    <span className="btn-row">
      <input
        type="datetime-local"
        className="input"
        aria-label="Διαλέγω μέρα και ώρα"
        min={athensInputOf(now)}
        value={value}
        onChange={(event) => setValue(event.target.value)}
      />
      <button
        type="button"
        className="button"
        data-ghost="true"
        disabled={!isValid}
        onClick={() => isValid && postpone(keys, until)}
      >
        Ως τότε
      </button>
    </span>
  );
}

// «Αργότερα ▾» / «Μετάθεση όλων ▾»: οι έτοιμες ώρες και «Διαλέγω μέρα και ώρα»· η γραμμή φεύγει ως τότε.
export function LaterMenu({ keys, label, now, postpone }: LaterMenuProps) {
  return (
    <details className="flow-later">
      <summary className="button" data-ghost="true">
        {label}
      </summary>
      <div className="btn-row flow-later-options">
        {laterOptions(now).map((option) => (
          <button
            key={option.label}
            type="button"
            className="button"
            data-ghost="true"
            onClick={() => postpone(keys, option.until)}
          >
            {option.label}
          </button>
        ))}
        <details className="flow-later-pick">
          <summary className="button" data-ghost="true">
            Διαλέγω μέρα και ώρα
          </summary>
          <PickTime keys={keys} now={now} postpone={postpone} />
        </details>
      </div>
    </details>
  );
}
