"use client";

import Link from "next/link";
import { createContext, useContext, type ReactNode } from "react";

import type { FormState } from "@/lib/form-state";
import { useFormChanged } from "@/lib/use-form-changed";
import { useKeptForm } from "@/lib/use-kept-form";

type Action = (state: FormState, form: FormData) => Promise<FormState>;

// Οι φόρμες της C2 πάνω στις πραγματικές ενέργειες: η φόρμα τυλίγει το Panel του prototype
// και το κουμπί (C2Submit) μπαίνει μέσα στο Panel. Κρατά ό,τι γράφτηκε αν η βάση πει όχι.

interface FormContextValue {
  state: FormState;
  isPending: boolean;
  isChanged: boolean;
}

const FormContext = createContext<FormContextValue | null>(null);

interface C2FormProps {
  action: Action;
  itemId?: string;
  children: ReactNode;
}

export function C2Form({ action, itemId, children }: C2FormProps) {
  const { state, isPending, onSubmit, formRef } = useKeptForm(action);
  const isChanged = useFormChanged(formRef, state.notice ? state : undefined);
  return (
    <form ref={formRef} onSubmit={onSubmit}>
      {itemId && <input type="hidden" name="itemId" value={itemId} />}
      <FormContext.Provider value={{ state, isPending, isChanged }}>
        {children}
      </FormContext.Provider>
    </form>
  );
}

function C2Message({ state }: { state: FormState }) {
  const text = state.error ?? state.notice;
  if (!text) return null;
  const isError = state.error !== undefined;
  return (
    <span
      className="feedback-msg"
      data-tone={isError ? "error" : "ok"}
      data-shown="true"
      role={isError ? "alert" : "status"}
    >
      <span aria-hidden="true">{isError ? "!" : "✓"}</span> {text}
    </span>
  );
}

interface C2SubmitProps {
  label: string;
  pendingLabel?: string;
  onlyWhenChanged?: boolean; // κρυφό όσο δεν έχει αλλάξει τιμή από την τελευταία αποθήκευση
  isPrimary?: boolean;
  isDanger?: boolean;
  aside?: ReactNode; // αχνό κείμενο στα αριστερά, όπως η κάτω γραμμή του prototype
  cancelHref?: string; // «Άκυρο» πριν από το κουμπί
}

export function C2Submit({
  label,
  pendingLabel = "Αποθήκευση…",
  onlyWhenChanged = false,
  isPrimary = true,
  isDanger = false,
  aside,
  cancelHref,
}: C2SubmitProps) {
  const context = useContext(FormContext);
  if (!context) throw new Error("Λείπει το C2Form");
  const { state, isPending, isChanged } = context;
  const isShown = !onlyWhenChanged || isChanged;
  return (
    <div className="row">
      {aside && <span className="muted">{aside}</span>}
      <span className="btn-row">
        <C2Message state={state} />
        {cancelHref && (
          <Link className="button" href={cancelHref}>
            Άκυρο
          </Link>
        )}
        {isShown && (
          <button
            type="submit"
            className="button"
            data-primary={(isPrimary && !isDanger) || undefined}
            data-danger={isDanger || undefined}
            disabled={isPending}
          >
            {isPending ? pendingLabel : label}
          </button>
        )}
      </span>
    </div>
  );
}

interface FieldProps {
  id: string;
  label: string;
  editable: boolean;
  value: ReactNode;
  input?: ReactNode;
  hint?: ReactNode;
}

// Ένα πεδίο (prototype `c2-sections.tsx`): input για όποιον το αλλάζει, κείμενο για τους υπόλοιπους, στην ίδια θέση.
// Ό,τι δεν είναι input δεν στέλνεται, άρα η βάση δεν το αγγίζει.
export function Field({ id, label, editable, value, input, hint }: FieldProps) {
  const isInput = editable && input !== undefined;
  return (
    <>
      <dt>{isInput ? <label htmlFor={id}>{label}</label> : label}</dt>
      <dd>
        {isInput ? input : value}
        {hint && <div className="muted">{hint}</div>}
      </dd>
    </>
  );
}

export const Dash = () => <span className="muted">—</span>;

