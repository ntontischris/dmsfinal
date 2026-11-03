"use client";

import { useState } from "react";

import type { FormState } from "@/lib/form-state";
import { useKeptForm } from "@/lib/use-kept-form";
import { ListRow, RowList } from "@/spaces/kit/parts";
import { Panel } from "@/spaces/kit/panel";
import { Badge } from "@/spaces/screens/shared";

import {
  restoreBlockedKind,
  retireBlockedKind,
  saveBlockedKind,
} from "../actions-kinds";
import type { BlockedKind } from "../types";
import { KindBadge, KindStyleForm } from "./o4-kind-style";

// Τα Είδη κλεισμένου χρόνου στις Ρυθμίσεις › Γυρίσματα, στη μορφή του ListEditor του prototype (`screens/o-shared.tsx`),
// όπως οι Τρόποι είσπραξης της O6: προσθήκη, μετονομασία, απόσυρση και επαναφορά· χωρίς διαγραφή.

type Action = (state: FormState, form: FormData) => Promise<FormState>;

const MAX_LABEL = 40;
const KINDS_NOTE =
  "Κάθε ενεργό Είδος έχει δικό του κουμπί «+ Είδος» στο Ημερολόγιο και φαίνεται εκεί με το χρώμα και το εικονίδιό του, μόνο σε όσους βλέπουν και τον τίτλο. Οι υπόλοιποι βλέπουν «Απασχολημένος». Ένα Είδος δεν διαγράφεται· αποσύρεται, και ο παλιός κλεισμένος χρόνος το κρατά.";

function FormNote({ state }: { state: FormState }) {
  const text = state.error ?? state.notice;
  if (!text) return null;
  return (
    <span className="note" role={state.error ? "alert" : "status"}>
      {text}
    </span>
  );
}

// Μετονομασία: η «Αποθήκευση» ανάβει μόνο όταν η ονομασία άλλαξε.
function RenameForm({ kind }: { kind: BlockedKind }) {
  const { state, isPending, onSubmit, formRef } = useKeptForm(saveBlockedKind);
  const [value, setValue] = useState(kind.label);
  const isChanged = value.trim() !== "" && value !== kind.label;
  return (
    <form ref={formRef} className="btn-row" onSubmit={onSubmit}>
      <input type="hidden" name="id" value={kind.id} />
      <input
        className="input"
        name="label"
        maxLength={MAX_LABEL}
        aria-label={`Νέα ονομασία: ${kind.label}`}
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

type Editing = "rename" | "style" | null;

function KindRow({ kind, index }: { kind: BlockedKind; index: number }) {
  const [editing, setEditing] = useState<Editing>(null);
  const toggle = (next: Exclude<Editing, null>) =>
    setEditing((current) => (current === next ? null : next));
  const sub = kind.retired ? undefined : editing === "rename" ? (
    <RenameForm kind={kind} />
  ) : editing === "style" ? (
    <KindStyleForm kind={kind} />
  ) : undefined;
  return (
    <ListRow
      isFaded={kind.retired}
      lead={<span>{index + 1}</span>}
      title={
        <>
          <KindBadge kind={kind} />
          {kind.label}
        </>
      }
      sub={sub}
      aside={
        <>
          <Badge tone={kind.retired ? "faded" : "ok"}>
            {kind.retired ? "Αποσύρθηκε" : "Σε χρήση"}
          </Badge>
          {!kind.retired && (
            <>
              <button
                type="button"
                className="button"
                aria-expanded={editing === "rename"}
                aria-label={`Μετονομασία: ${kind.label}`}
                onClick={() => toggle("rename")}
              >
                Μετονομασία
              </button>
              <button
                type="button"
                className="button"
                aria-expanded={editing === "style"}
                aria-label={`Χρώμα και εικονίδιο: ${kind.label}`}
                onClick={() => toggle("style")}
              >
                Χρώμα
              </button>
            </>
          )}
          <RowAction
            action={kind.retired ? restoreBlockedKind : retireBlockedKind}
            id={kind.id}
            label={kind.retired ? "Επαναφορά" : "Απόσυρση"}
          />
        </>
      }
    />
  );
}

function AddKind() {
  const [isOpen, setIsOpen] = useState(false);
  const { state, isPending, onSubmit, formRef } = useKeptForm(saveBlockedKind, {
    resetOnSuccess: true,
  });
  if (!isOpen)
    return (
      <button type="button" className="button" onClick={() => setIsOpen(true)}>
        + Νέο Είδος
      </button>
    );
  return (
    <form ref={formRef} className="btn-row" onSubmit={onSubmit}>
      <input type="hidden" name="id" value="" />
      <input
        className="input"
        name="label"
        maxLength={MAX_LABEL}
        aria-label="Νέο Είδος"
        placeholder="π.χ. Γιατρός"
      />
      <button
        type="submit"
        className="button"
        data-primary="true"
        disabled={isPending}
      >
        Προσθήκη Είδους
      </button>
      <FormNote state={state} />
    </form>
  );
}

export function BlockedKindsEditor({
  kinds,
}: {
  kinds: readonly BlockedKind[];
}) {
  return (
    <div className="o-card">
      <Panel
        label="Είδη κλεισμένου χρόνου"
        aside={<Badge>μόνο ελληνικά</Badge>}
      >
        {kinds.length === 0 ? (
          <p className="muted">
            Κανένα Είδος ακόμα. Χωρίς Είδη ο κλεισμένος χρόνος φαίνεται ως
            «Κλεισμένος χρόνος».
          </p>
        ) : (
          <RowList>
            {kinds.map((kind, index) => (
              <KindRow key={kind.id} kind={kind} index={index} />
            ))}
          </RowList>
        )}
        <div className="btn-row o-list-actions">
          <AddKind />
        </div>
        <p className="muted o-hint">{KINDS_NOTE}</p>
      </Panel>
    </div>
  );
}
