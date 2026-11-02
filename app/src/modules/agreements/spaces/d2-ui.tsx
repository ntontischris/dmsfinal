"use client";

import { createContext, useContext, useState, type ReactNode } from "react";

import { INITIAL_FORM_STATE, type FormState } from "@/lib/form-state";
import { useKeptForm } from "@/lib/use-kept-form";

// Κοινά της D2 στη μορφή του prototype (`screens/d2-ui.tsx`): πεδίο ή κείμενο στην ίδια θέση, και η επιβεβαίωση μιας
// ενέργειας μέσα στη σελίδα. Εδώ κάθε αλλαγή περνά από το πραγματικό action· το μήνυμα ζει στο D2Scope που περιέχει τη
// φόρμα, ώστε να μένει όταν η ενέργεια κάνει το κουμπί της περιττό (π.χ. μετά την «Αποστολή»).

type Action = (state: FormState, form: FormData) => Promise<FormState>;

const ScopeContext = createContext<((state: FormState) => void) | null>(null);

export function Confirmation({ state }: { state: FormState }) {
  if (state.error)
    return (
      <p className="note" role="alert">
        {state.error}
      </p>
    );
  if (!state.notice) return null;
  return (
    <p className="d2-confirm" role="status">
      {state.notice}
    </p>
  );
}

export function D2Scope({
  children,
  messageAt = "bottom",
}: {
  children: ReactNode;
  messageAt?: "top" | "bottom";
}) {
  const [state, setState] = useState<FormState>(INITIAL_FORM_STATE);
  const message = <Confirmation state={state} />;
  return (
    <ScopeContext value={setState}>
      {messageAt === "top" && message}
      {children}
      {messageAt === "bottom" && message}
    </ScopeContext>
  );
}

interface D2FormProps {
  action: Action;
  submitLabel?: string;
  pendingLabel?: string;
  isPrimary?: boolean;
  isDanger?: boolean;
  className?: string;
  id?: string;
  resetOnSuccess?: boolean;
  hideSubmit?: boolean; // τα κουμπιά τα βάζει η ίδια η φόρμα
  submitAriaLabel?: string;
  children?: ReactNode | ((isPending: boolean) => ReactNode);
}

// Φόρμα με πραγματικό action. Μέσα σε D2Scope το μήνυμα πηγαίνει εκεί· αλλιώς φαίνεται κάτω από τη φόρμα.
export function D2Form({
  action,
  submitLabel = "Αποθήκευση",
  pendingLabel,
  isPrimary = false,
  isDanger = false,
  className = "stack",
  id,
  resetOnSuccess = false,
  hideSubmit = false,
  submitAriaLabel,
  children,
}: D2FormProps) {
  const report = useContext(ScopeContext);
  const run: Action = async (previous, form) => {
    const next = await action(previous, form);
    report?.(next);
    return next;
  };
  const { state, isPending, onSubmit, formRef } = useKeptForm(run, {
    resetOnSuccess,
  });
  return (
    <form ref={formRef} id={id} className={className} onSubmit={onSubmit}>
      {typeof children === "function" ? children(isPending) : children}
      {report ? null : <Confirmation state={state} />}
      {!hideSubmit && (
        <span className="btn-row">
          <button
            type="submit"
            className="button"
            data-primary={isPrimary ? "true" : undefined}
            data-danger={isDanger ? "true" : undefined}
            aria-label={submitAriaLabel}
            disabled={isPending}
          >
            {isPending ? (pendingLabel ?? `${submitLabel}…`) : submitLabel}
          </button>
        </span>
      )}
    </form>
  );
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
  name?: string;
  label?: string;
  defaultValue?: string;
  value?: string;
  onChange?: (value: string) => void;
  suffix?: string;
  inputMode?: "numeric" | "decimal";
  min?: number;
  max?: number;
  form?: string;
  placeholder?: string;
}

// Αριθμητικό πεδίο του prototype. Τα κείμενα τα διαβάζει ο server (κόμμα ως υποδιαστολή), όπως στη σημερινή σελίδα.
export function NumberInput({
  id,
  label,
  suffix,
  onChange,
  inputMode = "numeric",
  ...input
}: NumberInputProps) {
  return (
    <span className="d2-num">
      <input
        id={id}
        aria-label={id ? undefined : label}
        className="input"
        inputMode={inputMode}
        autoComplete="off"
        onChange={
          onChange ? (event) => onChange(event.target.value) : undefined
        }
        {...input}
      />
      {suffix && <span className="muted">{suffix}</span>}
    </span>
  );
}

export const IdField = ({ id }: { id: string }) => (
  <input type="hidden" name="agreementId" value={id} />
);

// Το ποσό με κόμμα και δύο δεκαδικά· αριθμός με κόμμα ως υποδιαστολή (όπως τα πεδία της σημερινής σελίδας).
export const moneyInput = (amount: number): string =>
  amount.toFixed(2).replace(".", ",");
export const decimalInput = (value: number): string =>
  String(value).replace(".", ",");

export const plural = (count: number, one: string, many: string): string =>
  `${count} ${count === 1 ? one : many}`;
