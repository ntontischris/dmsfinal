"use client";

import { useState } from "react";

import type { FormState } from "@/lib/form-state";
import { useKeptForm } from "@/lib/use-kept-form";
import type { PaymentMethod } from "@/modules/finance";
import { ListRow, RowList } from "@/spaces/kit/parts";
import { Panel } from "@/spaces/kit/panel";
import { Badge } from "@/spaces/screens/shared";

// Οι Τρόποι είσπραξης για όποιον τους αλλάζει, στη μορφή του ListEditor του prototype (`screens/o-shared.tsx`), με τις
// πραγματικές ενέργειες της κλασικής κάρτας: προσθήκη, μετονομασία, απόσυρση και επαναφορά· χωρίς διαγραφή.
// Οι ενέργειες έρχονται από τη σελίδα (server actions του module Οικονομικά).

type Action = (state: FormState, form: FormData) => Promise<FormState>;

export interface MethodActions {
  save: Action;
  retire: Action;
  restore: Action;
}

const METHODS_NOTE =
  "Ένας τρόπος που έχει χρησιμοποιηθεί δεν διαγράφεται· αποσύρεται, και οι παλιές Εισπράξεις κρατούν τον τρόπο τους.";
const MAX_LABEL = 60;

function FormNote({ state }: { state: FormState }) {
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

function RowAction({
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
  index,
  actions,
}: {
  method: PaymentMethod;
  index: number;
  actions: MethodActions;
}) {
  const [isRenaming, setIsRenaming] = useState(false);
  return (
    <ListRow
      isFaded={method.retired}
      lead={<span>{index + 1}</span>}
      title={method.label}
      sub={
        isRenaming && !method.retired ? (
          <RenameForm save={actions.save} method={method} />
        ) : undefined
      }
      aside={
        <>
          <Badge tone={method.retired ? "faded" : "ok"}>
            {method.retired ? "Αποσύρθηκε" : "Σε χρήση"}
          </Badge>
          {!method.retired && (
            <button
              type="button"
              className="button"
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
        </>
      }
    />
  );
}

function AddMethod({ save }: { save: Action }) {
  const [isOpen, setIsOpen] = useState(false);
  const { state, isPending, onSubmit, formRef } = useKeptForm(save, {
    resetOnSuccess: true,
  });
  if (!isOpen)
    return (
      <button type="button" className="button" onClick={() => setIsOpen(true)}>
        + Νέα τιμή
      </button>
    );
  return (
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
    <div className="o-card">
      <Panel label="Τρόποι είσπραξης" aside={<Badge>μόνο ελληνικά</Badge>}>
        <RowList>
          {methods.map((method, index) => (
            <MethodRow
              key={method.id}
              method={method}
              index={index}
              actions={actions}
            />
          ))}
        </RowList>
        <div className="btn-row o-list-actions">
          <AddMethod save={actions.save} />
        </div>
        <p className="muted o-hint">{METHODS_NOTE}</p>
      </Panel>
    </div>
  );
}
