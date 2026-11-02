"use client";

import { useEffect, type ReactNode } from "react";

import type { FormState } from "@/lib/form-state";
import { useKeptForm } from "@/lib/use-kept-form";

type Action = (state: FormState, form: FormData) => Promise<FormState>;

// Οι φόρμες του H2 (prototype `screens/h2-forms.tsx`: `.h2-form`, `.h2-error`, `.btn-row`) πάνω στις πραγματικές ενέργειες.
// Κρατά ό,τι γράφτηκε αν η βάση πει όχι και δείχνει το λάθος της· με επιτυχία κλείνει (η σελίδα φρεσκάρεται από τη βάση).

function Message({ state }: { state: FormState }) {
  if (state.error)
    return (
      <span className="h2-error" role="alert">
        {state.error}
      </span>
    );
  if (state.notice)
    return (
      <p className="note" role="status">
        {state.notice}
      </p>
    );
  return null;
}

interface H2FormProps {
  action: Action;
  submitLabel: string;
  hidden: Readonly<Record<string, string>>;
  isPrimary?: boolean;
  isDanger?: boolean;
  resetOnSuccess?: boolean;
  onSuccess?: () => void;
  onClose?: () => void;
  children?: ReactNode;
}

const Hidden = ({ fields }: { fields: Readonly<Record<string, string>> }) =>
  Object.entries(fields).map(([name, value]) => (
    <input key={name} type="hidden" name={name} value={value} />
  ));

export function H2Form({
  action,
  submitLabel,
  hidden,
  isPrimary = false,
  isDanger = false,
  resetOnSuccess = false,
  onSuccess,
  onClose,
  children,
}: H2FormProps) {
  const { state, isPending, onSubmit, formRef } = useKeptForm(action, {
    resetOnSuccess,
  });
  useEffect(() => {
    if (state.notice) onSuccess?.();
  }, [state, onSuccess]);
  return (
    <form ref={formRef} className="h2-form" onSubmit={onSubmit}>
      <Hidden fields={hidden} />
      {children}
      <Message state={state} />
      <div className="btn-row">
        <button
          type="submit"
          className="button"
          data-primary={isPrimary || undefined}
          data-danger={isDanger || undefined}
          disabled={isPending}
        >
          {submitLabel}
        </button>
        {onClose && (
          <button type="button" className="button" onClick={onClose}>
            Άκυρο
          </button>
        )}
      </div>
    </form>
  );
}

interface ButtonFormProps {
  action: Action;
  label: string;
  hidden: Readonly<Record<string, string>>;
  isPrimary?: boolean;
}

// Ενέργεια με ένα πάτημα (π.χ. «Στέλνω στον πελάτη»): ένα κουμπί, και το λάθος της βάσης ακριβώς δίπλα.
export function ButtonForm({
  action,
  label,
  hidden,
  isPrimary = false,
}: ButtonFormProps) {
  const { state, isPending, onSubmit, formRef } = useKeptForm(action);
  return (
    <form ref={formRef} className="h2-inline" onSubmit={onSubmit}>
      <Hidden fields={hidden} />
      <button
        type="submit"
        className="button"
        data-primary={isPrimary || undefined}
        disabled={isPending}
      >
        {label}
      </button>
      {state.error && (
        <span className="h2-error" role="alert">
          {state.error}
        </span>
      )}
    </form>
  );
}

// Πεδίο που αποθηκεύει μόλις αλλάξει (Ανατεθειμένος, Προθεσμία στην κεφαλίδα), όπως στο prototype:
// το πεδίο καλεί το submitOnChange.
export function AutoSaveForm({
  action,
  hidden,
  children,
}: {
  action: Action;
  hidden: Readonly<Record<string, string>>;
  children: ReactNode;
}) {
  const { state, onSubmit, formRef } = useKeptForm(action);
  return (
    <form ref={formRef} className="h2-inline" onSubmit={onSubmit}>
      <Hidden fields={hidden} />
      {children}
      {state.error && (
        <span className="h2-error" role="alert">
          {state.error}
        </span>
      )}
    </form>
  );
}

// Υποβάλλει τη φόρμα του πεδίου που άλλαξε (κενή τιμή = τίποτα, π.χ. μισογραμμένη ημερομηνία).
export const submitOnChange = (event: {
  currentTarget: HTMLInputElement | HTMLSelectElement;
}): void => {
  const { form, type, value } = event.currentTarget;
  if (type === "date" && value === "") return;
  form?.requestSubmit();
};
