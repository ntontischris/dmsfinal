"use client";

import { useActionState, useState, type ReactNode } from "react";

import { INITIAL_FORM_STATE, type FormState } from "@/lib/form-state";

import { saveExpenses } from "../actions-expenses";
import type { ExpenseCategory } from "../expenses-schema";
import { CategoryRow } from "./i6-row";
import { I6Facts, I6HeroShell } from "./i6-hero";
import {
  addCategory,
  applyEdit,
  applyRemoval,
  draftsTotal,
  toCategories,
  toDrafts,
  undoLast,
  type CategoryDraft,
  type Edit,
  type EditorState,
} from "./i6-model";

// Ο επεξεργαστής Εξόδων (prototype `screens/i6-editor.tsx`). Προσθήκη της εφαρμογής: η «Αποθήκευση» στο πραγματικό
// `saveExpenses` (όλη η ανάλυση μαζί με τις ώρες) και το σύνολο ενός μήνα που έχει μόνο σύνολο, χωρίς ανάλυση.
// Εμφάνιση «Χρημάτων»: η κεφαλίδα (ml-hero) με το Κόστος ώρας και τη μία «Αποθήκευση», κάθε κατηγορία μία γραμμή που
// ανοίγει, και η προσθήκη κατηγορίας σε κλειστό κουτί «+ Νέα κατηγορία».

interface EditorProps {
  month: string;
  categories: readonly ExpenseCategory[];
  productiveHours: number;
  editable: boolean;
  // Οι Παραγωγικές ώρες θέλουν «Διαχειρίζεται κόστος»· όποιος μόνο καταχωρεί έξοδα δεν τις αλλάζει.
  canEditHours?: boolean;
  // Μήνας χωρίς ανάλυση: το ένα σύνολό του μετρά όσο δεν υπάρχουν γραμμές.
  baseTotal?: number;
  // Οι σημειώσεις του μήνα, μέσα στην κεφαλίδα.
  notes?: ReactNode;
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
    <form action={action} className="i6-save-form">
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
      <p>
        <button type="submit" data-primary disabled={isPending || !touched}>
          {isPending ? "Αποθήκευση…" : "Αποθήκευση"}
        </button>
      </p>
    </form>
  );
}

function NewCategoryBox({ onAdd }: { onAdd: () => void }) {
  return (
    <details className="ml-box ml-new">
      <summary>
        <strong>+ Νέα κατηγορία</strong>
        <small>
          Κατηγορία → έξοδα → γραμμές με ποσό. Μετά η «Αποθήκευση» πάνω δεξιά.
        </small>
      </summary>
      <p className="ml-actions">
        <button type="button" data-primary onClick={onAdd}>
          Προσθήκη κατηγορίας
        </button>
      </p>
    </details>
  );
}

function UndoBar({ message, onUndo }: { message: string; onUndo: () => void }) {
  // Στο τέλος και «κολλημένο» κάτω: φαίνεται όπου κι αν πατήθηκε η αφαίρεση.
  return (
    <p className="note ml-quick i67-undo" role="status">
      <span>{message}</span>
      <button type="button" data-primary onClick={onUndo}>
        Αναίρεση
      </button>
    </p>
  );
}

// Οι Παραγωγικές ώρες σε δικό τους κλειστό κουτί (όχι πεδίο μέσα στην κεφαλίδα)· η «Αποθήκευση» πάνω τις κρατά μαζί.
function HoursBox({
  hours,
  onHours,
}: {
  hours: number;
  onHours: (hours: number) => void;
}) {
  return (
    <details className="ml-box">
      <summary>
        <strong className="ml-box-title">Παραγωγικές ώρες</strong>
        <small>{hours} ώρες τον μήνα · από αυτές βγαίνει το Κόστος ώρας</small>
      </summary>
      <div className="ml-fields">
        <label className="ml-field">
          <span>Παραγωγικές ώρες</span>
          <input
            className="input"
            type="number"
            min={1}
            value={hours}
            onChange={(e) => onHours(Number(e.target.value) || 0)}
          />
          <small>Μετά πάτα «Αποθήκευση» πάνω.</small>
        </label>
      </div>
    </details>
  );
}

function useEditor(
  categories: readonly ExpenseCategory[],
  productiveHours: number,
) {
  const [state, setState] = useState<EditorState>(() => ({
    cats: toDrafts(categories),
    undo: null,
  }));
  const [hours, setHours] = useState(productiveHours);
  const [touched, setTouched] = useState(false);
  const [added, setAdded] = useState<readonly string[]>([]);
  const update = (edit: Edit) => {
    setState((current) => applyEdit(current, edit));
    setTouched(true);
  };
  return {
    ...state,
    hours,
    touched,
    added,
    update,
    remove: (edit: Edit, message: string) => {
      setState((current) => applyRemoval(current, edit, message));
      setTouched(true);
    },
    updateHours: (value: number) => {
      setHours(value);
      setTouched(true);
    },
    addNew: () => {
      const id = crypto.randomUUID();
      setAdded((ids) => [...ids, id]);
      update(addCategory(id));
    },
    undoNow: () => setState(undoLast),
    saved: () => setTouched(false),
  };
}

export function I6Editor(props: EditorProps) {
  const { month, editable, canEditHours = editable, baseTotal = 0 } = props;
  const ed = useEditor(props.categories, props.productiveHours);
  const total = ed.cats.length > 0 ? draftsTotal(ed.cats) : baseTotal;
  return (
    <>
      <I6HeroShell
        notes={props.notes}
        actions={
          editable && (
            <SaveRow
              month={month}
              cats={ed.cats}
              hours={ed.hours}
              touched={ed.touched}
              onSaved={ed.saved}
            />
          )
        }
      >
        <I6Facts month={month} total={total} hours={ed.hours} />
      </I6HeroShell>
      {canEditHours && <HoursBox hours={ed.hours} onHours={ed.updateHours} />}
      {ed.touched && (
        <p className="note" role="status">
          Ισχύει από αυτόν τον μήνα και μετά· οι κλεισμένοι μήνες δεν αλλάζουν.
        </p>
      )}
      {ed.cats.length > 0 && (
        <ol className="ml-list i6-cats" aria-label="Κατηγορίες εξόδων">
          {ed.cats.map((cat, ci) => (
            <CategoryRow
              key={cat.id}
              cat={cat}
              ci={ci}
              isNew={ed.added.includes(cat.id)}
              editable={editable}
              update={ed.update}
              remove={ed.remove}
            />
          ))}
        </ol>
      )}
      {editable && <NewCategoryBox onAdd={ed.addNew} />}
      {ed.undo && <UndoBar message={ed.undo.message} onUndo={ed.undoNow} />}
    </>
  );
}
