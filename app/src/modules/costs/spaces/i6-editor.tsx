"use client";

import { useActionState, useState } from "react";

import { INITIAL_FORM_STATE, type FormState } from "@/lib/form-state";
import { Panel } from "@/spaces/kit/panel";
import { fmtMoney } from "@/spaces/screens/shared";

import { saveExpenses } from "../actions-expenses";
import type { ExpenseCategory } from "../expenses-schema";
import { CategoryCard } from "./i6-category";
import {
  addCategory,
  applyEdit,
  applyRemoval,
  draftsTotal,
  fmtRate,
  rateOf,
  toCategories,
  toDrafts,
  undoLast,
  type CategoryDraft,
  type Edit,
  type EditorState,
} from "./i6-model";

// Ο επεξεργαστής Εξόδων (prototype `screens/i6-editor.tsx`). Προσθήκη της εφαρμογής: η «Αποθήκευση» στο πραγματικό
// `saveExpenses` (όλη η ανάλυση μαζί με τις ώρες) και το σύνολο ενός μήνα που έχει μόνο σύνολο, χωρίς ανάλυση.

interface EditorProps {
  month: string;
  categories: readonly ExpenseCategory[];
  productiveHours: number;
  editable: boolean;
  // Οι Παραγωγικές ώρες θέλουν «Διαχειρίζεται κόστος»· όποιος μόνο καταχωρεί έξοδα δεν τις αλλάζει.
  canEditHours?: boolean;
  // Μήνας χωρίς ανάλυση: το ένα σύνολό του μετρά όσο δεν υπάρχουν γραμμές.
  baseTotal?: number;
}

interface SummaryProps {
  total: number;
  hours: number;
  editable: boolean;
  onHours: (hours: number) => void;
}

function Summary({ total, hours, editable, onHours }: SummaryProps) {
  return (
    <Panel label="Κόστος ώρας">
      <p className="i67-big">{fmtRate(rateOf(total, hours))}</p>
      <dl className="dl">
        <dt>Σύνολο εξόδων</dt>
        <dd>{fmtMoney(total)}</dd>
        <dt>Παραγωγικές ώρες</dt>
        <dd>
          {editable ? (
            <input
              className="input"
              type="number"
              min={1}
              aria-label="Παραγωγικές ώρες"
              value={hours}
              onChange={(e) => onHours(Number(e.target.value) || 0)}
            />
          ) : (
            hours
          )}
        </dd>
      </dl>
    </Panel>
  );
}

interface SaveProps {
  month: string;
  cats: readonly CategoryDraft[];
  hours: number;
  touched: boolean;
  onSaved: () => void;
}

function SaveRow({ month, cats, hours, touched, onSaved }: SaveProps) {
  const [state, action, isPending] = useActionState(
    async (previous: FormState, form: FormData) => {
      const next = await saveExpenses(previous, form);
      if (next.notice) onSaved();
      return next;
    },
    INITIAL_FORM_STATE,
  );
  return (
    <form action={action}>
      <input type="hidden" name="month" value={month} />
      <input
        type="hidden"
        name="categories"
        value={JSON.stringify(toCategories(cats))}
      />
      <input type="hidden" name="productiveHours" value={hours} />
      {state.error && (
        <p className="note" role="alert">
          {state.error}
        </p>
      )}
      {state.notice && !touched && (
        <p className="note" role="status">
          {state.notice}
        </p>
      )}
      <p className="btn-row">
        <button
          type="submit"
          className="button"
          data-primary="true"
          disabled={isPending || !touched}
        >
          {isPending ? "Αποθήκευση…" : "Αποθήκευση"}
        </button>
      </p>
    </form>
  );
}

export function I6Editor({
  month,
  categories,
  productiveHours,
  editable,
  canEditHours = editable,
  baseTotal = 0,
}: EditorProps) {
  const [state, setState] = useState<EditorState>(() => ({
    cats: toDrafts(categories),
    undo: null,
  }));
  const [hours, setHours] = useState(productiveHours);
  const [touched, setTouched] = useState(false);
  const { cats, undo } = state;
  const update = (edit: Edit) => {
    setState((current) => applyEdit(current, edit));
    setTouched(true);
  };
  const remove = (edit: Edit, message: string) => {
    setState((current) => applyRemoval(current, edit, message));
    setTouched(true);
  };
  const updateHours = (value: number) => {
    setHours(value);
    setTouched(true);
  };
  const total = cats.length > 0 ? draftsTotal(cats) : baseTotal;
  return (
    <div className="stack" style={{ alignItems: "stretch" }}>
      <Summary
        total={total}
        hours={hours}
        editable={canEditHours}
        onHours={updateHours}
      />
      {touched && (
        <p className="note" role="status">
          Ισχύει από αυτόν τον μήνα και μετά· οι κλεισμένοι μήνες δεν αλλάζουν.
        </p>
      )}
      {cats.map((cat, ci) => (
        <CategoryCard
          key={cat.id}
          cat={cat}
          ci={ci}
          editable={editable}
          update={update}
          remove={remove}
        />
      ))}
      {editable && (
        <p>
          <button
            type="button"
            className="button"
            onClick={() => update(addCategory(crypto.randomUUID()))}
          >
            Προσθήκη κατηγορίας
          </button>
        </p>
      )}
      {editable && (
        <SaveRow
          month={month}
          cats={cats}
          hours={hours}
          touched={touched}
          onSaved={() => setTouched(false)}
        />
      )}
      {/* Στο τέλος και «κολλημένο» κάτω: φαίνεται όπου κι αν πατήθηκε η αφαίρεση. */}
      {undo && (
        <p className="note btn-row i67-undo" role="status">
          <span>{undo.message}</span>
          <button
            type="button"
            className="button"
            data-primary="true"
            onClick={() => setState(undoLast)}
          >
            Αναίρεση
          </button>
        </p>
      )}
    </div>
  );
}
