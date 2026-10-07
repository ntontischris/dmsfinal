import type { ReactNode } from "react";

interface FieldProps {
  label: string;
  value?: string;
  area?: boolean;
  required?: boolean;
  hint?: string;
  type?: string;
}

export function Field({
  label,
  value,
  area,
  required,
  hint,
  type = "text",
}: FieldProps) {
  return (
    <label className="q-field">
      <span>
        {label}
        {required ? " *" : ""}
      </span>
      {area ? (
        <textarea className="input" defaultValue={value} required={required} />
      ) : (
        <input
          className="input"
          type={type}
          defaultValue={value}
          required={required}
        />
      )}
      {hint && <span className="q-hint">{hint}</span>}
    </label>
  );
}

export const Pair = ({ el, en }: { el: ReactNode; en: ReactNode }) => (
  <div className="q-pair">
    <div>{el}</div>
    <div>{en}</div>
  </div>
);

export function SaveBar({ isNew }: { isNew: boolean }) {
  return (
    <div className="btn-row">
      <button className="button" type="button" data-primary="true">
        {isNew ? "Δημιουργία (θα είναι κρυφή)" : "Αποθήκευση"}
      </button>
    </div>
  );
}

