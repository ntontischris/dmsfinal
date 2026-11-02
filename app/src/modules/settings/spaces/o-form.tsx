"use client";

import {
  createContext,
  useContext,
  useState,
  type FormEvent,
  type ReactNode,
} from "react";

import type { FormState } from "@/lib/form-state";
import { useFormChanged } from "@/lib/use-form-changed";
import { useKeptForm } from "@/lib/use-kept-form";

// Η αποθήκευση των καρτών Ρυθμίσεων στη νέα εμφάνιση: η μορφή του SaveRow του prototype (`screens/o-shared.tsx`),
// με το πραγματικό action. Μία φόρμα μπορεί να απλώνεται σε δύο κάρτες (π.χ. Στοιχεία + Υπογράφων), γιατί το action
// αποθηκεύει όλα τα πεδία μαζί· κάθε κάρτα έχει το δικό της κουμπί και το μήνυμα φαίνεται κάτω από όποιο πατήθηκε.

type Action = (state: FormState, form: FormData) => Promise<FormState>;

interface FormContextValue {
  state: FormState;
  isPending: boolean;
  isChanged: boolean;
  lastCard: string | null;
}

const FormContext = createContext<FormContextValue | null>(null);

interface SettingsFormProps {
  action: Action;
  // updated_at που είδε ο Χρήστης: αν άλλαξε στο μεταξύ, η αποθήκευση το λέει.
  version?: string;
  resetOnSuccess?: boolean;
  children: ReactNode;
}

const cardOf = (event: FormEvent<HTMLFormElement>): string | null => {
  const submitter =
    event.nativeEvent instanceof SubmitEvent
      ? event.nativeEvent.submitter
      : null;
  return submitter instanceof HTMLButtonElement
    ? submitter.value || null
    : null;
};

export function SettingsForm({
  action,
  version,
  resetOnSuccess = false,
  children,
}: SettingsFormProps) {
  const { state, isPending, onSubmit, formRef } = useKeptForm(action, {
    resetOnSuccess,
  });
  const isChanged = useFormChanged(formRef, state.notice ? state : undefined);
  const [lastCard, setLastCard] = useState<string | null>(null);
  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    setLastCard(cardOf(event));
    onSubmit(event);
  };
  return (
    <FormContext.Provider value={{ state, isPending, isChanged, lastCard }}>
      <form ref={formRef} onSubmit={handleSubmit}>
        {version && <input type="hidden" name="version" value={version} />}
        {children}
      </form>
    </FormContext.Provider>
  );
}

interface SaveRowProps {
  // Ποια κάρτα: το μήνυμα της αποθήκευσης φαίνεται εδώ μόνο αν πατήθηκε αυτό το κουμπί.
  card: string;
  label?: string;
  // Για φόρμες «νέο …»: το κουμπί είναι πάντα ενεργό (δεν συγκρίνεται με αποθηκευμένες τιμές).
  isAlwaysEnabled?: boolean;
}

export function SaveRow({
  card,
  label = "Αποθήκευση",
  isAlwaysEnabled = false,
}: SaveRowProps) {
  const form = useContext(FormContext);
  if (!form) return null;
  const isMine = form.lastCard === null || form.lastCard === card;
  return (
    <>
      {isMine && form.state.error && (
        <p className="note" role="alert">
          {form.state.error}
        </p>
      )}
      {isMine && form.state.notice && !form.isChanged && (
        <p className="note" role="status">
          {form.state.notice}
        </p>
      )}
      <div className="btn-row">
        <button
          type="submit"
          className="button"
          data-primary="true"
          name="card"
          value={card}
          disabled={form.isPending || (!isAlwaysEnabled && !form.isChanged)}
        >
          {form.isPending && isMine ? "Αποθήκευση…" : label}
        </button>
      </div>
    </>
  );
}

interface ActionButtonProps {
  action: Action;
  // Τα κρυφά πεδία της ενέργειας (π.χ. το id του λογαριασμού).
  fields: Readonly<Record<string, string>>;
  label: string;
  pendingLabel?: string;
  isPrimary?: boolean;
  isDanger?: boolean;
}

// Μία ενέργεια με ένα κουμπί (π.χ. «Ορισμός προεπιλογής», «Επιβεβαίωση»), με το μήνυμά της από κάτω.
export function ActionButton({
  action,
  fields,
  label,
  pendingLabel = "Περιμένε…",
  isPrimary = false,
  isDanger = false,
}: ActionButtonProps) {
  const { state, isPending, onSubmit, formRef } = useKeptForm(action);
  return (
    <form ref={formRef} onSubmit={onSubmit} style={{ display: "inline" }}>
      {Object.entries(fields).map(([name, value]) => (
        <input key={name} type="hidden" name={name} value={value} />
      ))}
      <button
        type="submit"
        className="button"
        data-primary={isPrimary ? "true" : undefined}
        data-danger={isDanger ? "true" : undefined}
        disabled={isPending}
      >
        {isPending ? pendingLabel : label}
      </button>
      {state.error && (
        <span className="muted" role="alert">
          {" "}
          {state.error}
        </span>
      )}
    </form>
  );
}
