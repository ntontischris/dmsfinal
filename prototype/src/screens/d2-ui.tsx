"use client";

import type { ReactNode } from "react";

import type { AgreementRecord } from "@/data/agreements";
import type { AgreementCaps } from "@/data/agreements-access";

export type Update = (
  change: (draft: AgreementRecord) => AgreementRecord,
) => void;

// Κοινά props των ενοτήτων: isEditing = ο χρήστης συντάσσει τώρα (πεδία), αλλιώς κείμενο στην ίδια θέση.
export interface SectionProps {
  draft: AgreementRecord;
  update: Update;
  isEditing: boolean;
  caps: AgreementCaps;
}

interface FieldProps {
  id: string;
  label: string;
  isEditing: boolean;
  value: ReactNode;
  input: ReactNode;
  hint?: ReactNode;
}

export function Field({
  id,
  label,
  isEditing,
  value,
  input,
  hint,
}: FieldProps) {
  return (
    <>
      <dt>{isEditing ? <label htmlFor={id}>{label}</label> : label}</dt>
      <dd>
        {isEditing ? input : value}
        {hint && <div className="muted">{hint}</div>}
      </dd>
    </>
  );
}

interface NumberInputProps {
  id?: string;
  label?: string;
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
  step?: number;
  suffix?: string;
}

export function NumberInput({
  id,
  label,
  value,
  onChange,
  min = 0,
  max,
  step = 1,
  suffix,
}: NumberInputProps) {
  return (
    <span className="d2-num">
      <input
        id={id}
        aria-label={label}
        className="input"
        type="number"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(event) =>
          onChange(Math.max(min, Number(event.target.value) || 0))
        }
      />
      {suffix && <span className="muted">{suffix}</span>}
    </span>
  );
}

// Επιβεβαίωση μιας ενέργειας μέσα στη σελίδα. Όλα αλλάζουν μόνο τοπικά στο prototype.
export function Confirmation({ text }: { text: string | null }) {
  if (!text) return null;
  return (
    <p className="d2-confirm" role="status">
      {text}
    </p>
  );
}
