"use client";

import { useMemo, useState, type ReactNode } from "react";

import { fmtDate, fmtMoney } from "@/spaces/screens/shared";
import { useKeptForm } from "@/lib/use-kept-form";

import { registerInvoice } from "../actions-invoices";
import { KIND_LABELS } from "../invoices-labels";
import {
  amountOf,
  dueOf,
  hasTaxMismatch,
  missingOf,
  startDraft,
  warningsOf,
  type DraftForm,
  type NumberSuggestions,
} from "../invoices-model";
import type { InvoiceContext } from "../invoices-view-schema";
import { ExtraFields, FormFeedback, InvoiceFields } from "./i3-fields";
import { Fold, I3Hero, Step, capitalize } from "./i3-parts";
import { CoveragePreview, WarningsList } from "./i3-preview";

const LEAD =
  "Ανεβάζεις το PDF που εξέδωσες, γράφεις τα στοιχεία του και το καταχωρείς. Φεύγει email στον Πελάτη.";

// Πάνω: ποιο Τιμολόγιο, για ποιον Πελάτη, και το σύνολο ζωντανά όσο γράφεις.
function DraftHero({ form, ctx }: { form: DraftForm; ctx: InvoiceContext }) {
  const kind = KIND_LABELS[form.kind];
  const number = form.number.trim();
  const total = amountOf(form.total);
  return (
    <I3Hero
      tag={`Νέο ${kind}`}
      title={number ? `${capitalize(kind)} ${number}` : `Νέο ${kind}`}
      client={ctx.clientName}
      facts={[
        ctx.clientName,
        form.issueDate ? `έκδοση ${fmtDate(form.issueDate)}` : null,
      ]}
      amount={
        <p className="ml-hero-amount" data-open={total > 0}>
          {fmtMoney(total)}
          <small>
            σύνολο · καθαρό {fmtMoney(amountOf(form.net))} · ΦΠΑ{" "}
            {fmtMoney(amountOf(form.vat))}
          </small>
        </p>
      }
      lead={LEAD}
    />
  );
}

// Βήμα 2: το PDF ανεβαίνει μαζί με τη φόρμα. Τα στοιχεία τα γράφει ο Χρήστης (Π3: χωρίς ανάγνωση από AI).
function PdfStep({
  fileName,
  onFile,
}: {
  fileName: string;
  onFile: (name: string) => void;
}) {
  return (
    <Step
      no={2}
      title="PDF του Τιμολογίου"
      hint={fileName || "Έως 4 MB. Τα στοιχεία τα γράφεις στο επόμενο βήμα."}
    >
      <input
        className="input"
        type="file"
        name="pdf"
        accept="application/pdf"
        onChange={(e) => onFile(e.target.files?.[0]?.name ?? "")}
      />
    </Step>
  );
}

const extraHint = (form: DraftForm, ctx: InvoiceContext): string =>
  [
    form.kind === "credit"
      ? null
      : `λήξη ${fmtDate(dueOf(form, ctx.paymentDays))}`,
    `ΦΠΑ ${fmtMoney(amountOf(form.vat))}`,
    form.mark.trim() ? `ΜΑΡΚ ${form.mark.trim()}` : "χωρίς ΜΑΡΚ",
    form.pdfTaxId.trim() ? `ΑΦΜ ${form.pdfTaxId.trim()}` : null,
  ]
    .filter((part): part is string => part !== null)
    .join(" · ");

interface FormPartProps {
  form: DraftForm;
  ctx: InvoiceContext;
  onChange: (change: Partial<DraftForm>) => void;
}

function DetailsStep(
  props: FormPartProps & {
    onReplace: (next: DraftForm) => void;
    suggestions: NumberSuggestions;
  },
) {
  const { form, ctx, onChange } = props;
  return (
    <Step
      no={3}
      title="Στοιχεία"
      hint="Όπως είναι γραμμένα στο PDF. ΦΠΑ και σύνολο βγαίνουν από το καθαρό."
    >
      <InvoiceFields
        form={form}
        ctx={ctx}
        onChange={onChange}
        onReplace={props.onReplace}
        suggestions={props.suggestions}
      />
      <Fold title="Λήξη, ΦΠΑ, σύνολο, ΜΑΡΚ, ΑΦΜ" hint={extraHint(form, ctx)}>
        <ExtraFields form={form} ctx={ctx} onChange={onChange} />
      </Fold>
    </Step>
  );
}

function CheckStep(
  props: FormPartProps & {
    missing: readonly string[];
    isPending: boolean;
    error?: string;
  },
) {
  const { form, ctx, onChange } = props;
  return (
    <Step
      no={4}
      title="Έλεγχος και καταχώρηση"
      hint="Δες τις προειδοποιήσεις και καταχώρησε."
    >
      <CoveragePreview
        open={ctx.openBillables}
        net={amountOf(form.net)}
        isCredit={form.kind === "credit"}
        toInvoice={ctx.toInvoice}
      />
      <WarningsList warnings={warningsOf(form, ctx)} />
      {hasTaxMismatch(form, ctx) && (
        <label className="i13-check">
          <input
            type="checkbox"
            name="taxIdConfirmed"
            checked={form.taxIdConfirmed}
            onChange={(e) => onChange({ taxIdConfirmed: e.target.checked })}
          />
          <span>
            Το επιβεβαίωσα: το ΑΦΜ του PDF είναι σωστό παρά τη διαφορά.
          </span>
        </label>
      )}
      <p className="note">
        Η καταχώριση στέλνει email με το PDF στους ανθρώπους του Πελάτη που
        βλέπουν τα Τιμολόγιά του. Δεν παραλείπεται.
      </p>
      <FormFeedback error={props.error} />
      <button
        type="submit"
        className="i3-go"
        disabled={props.missing.length > 0 || props.isPending}
      >
        {props.isPending ? "Αποθήκευση…" : "Επιβεβαίωση και καταχώρηση"}
      </button>
      {props.missing.length > 0 && (
        <p className="i3-missing">Λείπει: {props.missing.join(", ")}</p>
      )}
    </Step>
  );
}

function DoneNotice({
  notice,
  onAgain,
}: {
  notice: string;
  onAgain: () => void;
}) {
  return (
    <I3Hero
      role="status"
      tag="Έτοιμο"
      title={notice}
      facts={[
        "Email με το PDF φεύγει στους ανθρώπους του Πελάτη που βλέπουν τα Τιμολόγιά του.",
      ]}
      actions={
        <button type="button" onClick={onAgain}>
          Νέα καταχώριση
        </button>
      }
    />
  );
}

interface WorkbenchProps {
  clientId: string;
  ctx: InvoiceContext;
  suggestions: NumberSuggestions;
  today: string;
  // Το βήμα 1 (Πελάτης): φόρμα GET του διακομιστή, έξω από τη φόρμα της καταχώρησης.
  clientStep: ReactNode;
}

// Η πρόχειρη φόρμα (προσυμπληρωμένη: επόμενος αριθμός, «Προς τιμολόγηση» ως καθαρό) και το όνομα του PDF,
// με επαναφορά για «Νέα καταχώριση».
function useDraft(
  today: string,
  ctx: InvoiceContext,
  suggestions: NumberSuggestions,
) {
  const empty = useMemo(
    () => startDraft(today, ctx, suggestions),
    [today, ctx, suggestions],
  );
  const [form, setForm] = useState<DraftForm>(empty);
  const [fileName, setFileName] = useState("");
  const handleChange = (change: Partial<DraftForm>) =>
    setForm((prev) => ({ ...prev, ...change }));
  const reset = () => {
    setForm(empty);
    setFileName("");
  };
  return { form, setForm, fileName, setFileName, handleChange, reset };
}

// Η Καταχώρηση πάνω στην πραγματική ενέργεια registerInvoice: hero με το σύνολο, μετά τα βήματα Πελάτης → PDF →
// Στοιχεία → Έλεγχος και καταχώρηση. Μετά την επιτυχία φαίνεται το «Καταχωρήθηκε» μέχρι τη νέα καταχώριση.
export function I3Workbench({
  clientId,
  ctx,
  suggestions,
  today,
  clientStep,
}: WorkbenchProps) {
  const { form, setForm, fileName, setFileName, handleChange, reset } =
    useDraft(today, ctx, suggestions);
  const { state, isPending, onSubmit, formRef } = useKeptForm(registerInvoice, {
    resetOnSuccess: true,
  });
  const [dismissed, setDismissed] = useState<typeof state | null>(null);
  const handleAgain = () => {
    setDismissed(state);
    reset();
  };
  const done = state !== dismissed ? state.notice : undefined;
  return (
    <div className="ml-stack">
      {done ? (
        <DoneNotice notice={done} onAgain={handleAgain} />
      ) : (
        <DraftHero form={form} ctx={ctx} />
      )}
      {clientStep}
      {!done && (
        <form ref={formRef} onSubmit={onSubmit} className="ml-stack">
          <input type="hidden" name="clientId" value={clientId} />
          <PdfStep fileName={fileName} onFile={setFileName} />
          <DetailsStep
            form={form}
            ctx={ctx}
            onChange={handleChange}
            onReplace={setForm}
            suggestions={suggestions}
          />
          <CheckStep
            form={form}
            ctx={ctx}
            onChange={handleChange}
            missing={missingOf(form, ctx, fileName !== "")}
            isPending={isPending}
            error={state.error}
          />
        </form>
      )}
    </div>
  );
}
