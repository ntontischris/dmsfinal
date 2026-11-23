"use client";

import { useState } from "react";

import type { FormState } from "@/lib/form-state";
import { useKeptForm } from "@/lib/use-kept-form";
import type { PaymentMethod } from "@/modules/finance";

import { MethodsHead, inUseCount, initialsOf } from "./o6-lines";

// Οι Τρόποι είσπραξης για όποιον τους αλλάζει, στη μορφή του ListEditor του prototype (`screens/o-shared.tsx`), με τις
// πραγματικές ενέργειες της κλασικής κάρτας: προσθήκη, μετονομασία, απόσυρση και επαναφορά· χωρίς διαγραφή.
// Οι ενέργειες έρχονται από τη σελίδα (server actions του module Οικονομικά). Μορφή «Χρήματα»: κάθε τρόπος μία γραμμή
// (ml-line) με γρήγορα κουμπιά· η προσθήκη σε κλειστό κουτί «+ Νέος τρόπος».

export type Action = (state: FormState, form: FormData) => Promise<FormState>;

export interface MethodActions {
  save: Action;
  retire: Action;
  restore: Action;
}

const METHODS_NOTE =
  "Ένας τρόπος που έχει χρησιμοποιηθεί δεν διαγράφεται· αποσύρεται, και οι παλιές Εισπράξεις κρατούν τον τρόπο τους.";
const MAX_LABEL = 60;

export function FormNote({ state }: { state: FormState }) {
  if (state.error)
    return (
      <span className="note" role="alert">
        {state.error}
      </span>
    );
  if (state.notice)
    return (
      <span className="note" role="status">
        {state.notice}
      </span>
    );
  return null;
}

// Μετονομασία: ανοίγει μόνο όταν η ονομασία άλλαξε (όπως το onlyWhenChanged της κλασικής).
function RenameForm({ save, method }: { save: Action; method: PaymentMethod }) {
  const { state, isPending, onSubmit, formRef } = useKeptForm(save);
  const [value, setValue] = useState(method.label);
  const isChanged = value.trim() !== "" && value !== method.label;
  return (
    <form ref={formRef} className="btn-row" onSubmit={onSubmit}>
      <input type="hidden" name="id" value={method.id} />
      <input
        className="input"
        name="label"
        maxLength={MAX_LABEL}
        aria-label={`Νέα ονομασία: ${method.label}`}
        value={value}
        onChange={(event) => setValue(event.target.value)}
      />
      <button
        type="submit"
        className="button"
        data-primary="true"
        disabled={isPending || !isChanged}
      >
        Αποθήκευση
      </button>
      <FormNote state={state} />
    </form>
  );
}

export function RowAction({
  action,
  id,
  label,
}: {
  action: Action;
  id: string;
  label: string;
}) {
  const { state, isPending, onSubmit, formRef } = useKeptForm(action);
  return (
    <form ref={formRef} onSubmit={onSubmit} style={{ display: "inline" }}>
      <input type="hidden" name="id" value={id} />
      <button type="submit" className="button" disabled={isPending}>
        {isPending ? "Περιμένε…" : label}
      </button>
      <FormNote state={state} />
    </form>
  );
}

function MethodRow({
  method,
  actions,
}: {
  method: PaymentMethod;
  actions: MethodActions;
}) {
  const [isRenaming, setIsRenaming] = useState(false);
  return (
    <li className="ml-line" data-faded={method.retired || undefined}>
      <span className="ml-thumb" aria-hidden="true">
        {initialsOf(method.label)}
      </span>
      <span className="ml-main">
        <span className="ml-tag">
          {method.retired ? "Αποσύρθηκε" : "Σε χρήση"}
        </span>
        <strong>{method.label}</strong>
        {isRenaming && !method.retired && (
          <RenameForm save={actions.save} method={method} />
        )}
      </span>
      <span className="ml-quick">
        {!method.retired && (
          <button
            type="button"
            aria-expanded={isRenaming}
            aria-label={`Μετονομασία: ${method.label}`}
            onClick={() => setIsRenaming((current) => !current)}
          >
            Μετονομασία
          </button>
        )}
        <RowAction
          action={method.retired ? actions.restore : actions.retire}
          id={method.id}
          label={method.retired ? "Επαναφορά" : "Απόσυρση"}
        />
      </span>
    </li>
  );
}

function AddMethod({ save }: { save: Action }) {
  const { state, isPending, onSubmit, formRef } = useKeptForm(save, {
    resetOnSuccess: true,
  });
  return (
    <details className="ml-box ml-new">
      <summary>
        <strong>+ Νέος τρόπος</strong>
        <small>
          Ένα όνομα, μόνο στα ελληνικά. Φαίνεται αμέσως στη «Νέα είσπραξη».
        </small>
      </summary>
      <form ref={formRef} className="btn-row" onSubmit={onSubmit}>
        <input type="hidden" name="id" value="" />
        <input
          className="input"
          name="label"
          maxLength={MAX_LABEL}
          aria-label="Νέος τρόπος"
          placeholder="Νέος τρόπος"
        />
        <button
          type="submit"
          className="button"
          data-primary="true"
          disabled={isPending}
        >
          Προσθήκη τρόπου
        </button>
        <FormNote state={state} />
      </form>
    </details>
  );
}

export function MethodsEditor({
  methods,
  actions,
}: {
  methods: readonly PaymentMethod[];
  actions: MethodActions;
}) {
  return (
    <section className="o6-methods">
      <MethodsHead inUse={inUseCount(methods)} />
      <ul className="ml-list">
        {methods.map((method) => (
          <MethodRow key={method.id} method={method} actions={actions} />
        ))}
      </ul>
      <AddMethod save={actions.save} />
      <p className="muted o-hint">{METHODS_NOTE}</p>
    </section>
  );
}
