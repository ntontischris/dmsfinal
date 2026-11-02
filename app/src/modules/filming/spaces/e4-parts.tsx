"use client";

import { useEffect, useState } from "react";

import { checkSlotWarning } from "../actions-booking";
import { DURATION_PRESETS, isAboveDefault, isExtraBalance } from "../helpers";
import type { BookingAgreement, BookingKind } from "../types";
import { FREE, kindBalanceLine, periodLine } from "./e4-model";

// Κομμάτια της φόρμας E4 (prototype `screens/e4-form.tsx`): διάρκεια, υπόλοιπο Παροχής, προειδοποίηση ώρας.

interface DurationProps {
  duration: string;
  freeHours: string;
  onDuration: (value: string) => void;
  onFreeHours: (value: string) => void;
}

export function DurationField({
  duration,
  freeHours,
  onDuration,
  onFreeHours,
}: DurationProps) {
  return (
    <div className="e-field">
      Διάρκεια
      <div className="btn-row">
        {[...DURATION_PRESETS.map(String), FREE].map((value) => (
          <button
            key={value}
            type="button"
            className="button e-pick"
            aria-pressed={duration === value}
            onClick={() => onDuration(value)}
          >
            {value === FREE ? "Άλλη διάρκεια" : `${value} ώρες`}
          </button>
        ))}
      </div>
      {duration === FREE && (
        <input
          className="input"
          type="number"
          inputMode="decimal"
          min={0.5}
          max={12}
          step={0.5}
          aria-label="Ώρες"
          value={freeHours}
          onChange={(e) => onFreeHours(e.target.value)}
        />
      )}
      <span className="muted">
        Η ομάδα δεν περιορίζεται στις επιτρεπτές διάρκειες του πελάτη: από 0,5
        έως 12 ώρες ανά μισή ώρα.
      </span>
    </div>
  );
}

// Η Περίοδος της Συμφωνίας και το υπόλοιπο του είδους· χωρίς υπόλοιπο, το Γύρισμα είναι έξτρα (επιτρέπεται στην ομάδα).
export function Availability({
  agreement,
  kind,
  hours,
}: {
  agreement: BookingAgreement;
  kind: BookingKind | undefined;
  hours: number;
}) {
  const period = periodLine(agreement);
  return (
    <>
      <div className="e-info">
        <strong>Σε ποια Παραγωγή μπαίνει:</strong> της Περιόδου της μέρας.
        <dl className="dl">
          <dt>Περίοδος</dt>
          <dd>{period ?? "Καμία ανοιχτή Περίοδος σήμερα"}</dd>
          {kind && (
            <>
              <dt>Παροχές «{kind.label}»</dt>
              <dd>{kindBalanceLine(kind)}</dd>
            </>
          )}
        </dl>
        <span className="muted">
          Μέρα της επόμενης Περιόδου χρεώνεται σε εκείνη την Περίοδο.
        </span>
      </div>
      {kind && isExtraBalance(kind.balance) && (
        <p className="e-warn" role="alert">
          Θα είναι έξτρα: η Παροχή τελείωσε. Επιτρέπεται για την ομάδα.
        </p>
      )}
      {kind && isAboveDefault(hours, kind.measure, kind.defaultHours) && (
        <p className="e-warn" role="alert">
          Πάνω από τη διάρκεια του είδους: το επιπλέον είναι έξτρα.
        </p>
      )}
    </>
  );
}

const DEBOUNCE_MS = 300;

// Χωρητικότητα, ωράριο, συγκρούσεις: μόνο προειδοποίηση, δεν μπλοκάρει (ίδιο check με την παλιά φόρμα).
export function SlotNotice({
  date,
  time,
  hours,
}: {
  date: string;
  time: string;
  hours: string;
}) {
  const [problem, setProblem] = useState<string | null>(null);
  useEffect(() => {
    let isActive = true;
    const timer = setTimeout(() => {
      checkSlotWarning({ date, time, hours }).then((result) => {
        if (isActive) setProblem(result.problem);
      });
    }, DEBOUNCE_MS);
    return () => {
      isActive = false;
      clearTimeout(timer);
    };
  }, [date, time, hours]);
  if (!problem) return null;
  return (
    <p className="e-warn" role="alert">
      Προσοχή στην ώρα: {problem} Η ομάδα μπορεί να συνεχίσει, αλλά έλεγξε το
      Συνεργείο και τον Εξοπλισμό.
    </p>
  );
}
