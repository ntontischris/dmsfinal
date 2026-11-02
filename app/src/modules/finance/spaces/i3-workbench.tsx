"use client";

import { useMemo, useState } from "react";

import { Panel } from "@/spaces/kit/panel";
import { useKeptForm } from "@/lib/use-kept-form";

import { registerInvoice } from "../actions-invoices";
import {
  amountOf,
  canSubmit,
  emptyDraft,
  hasTaxMismatch,
  warningsOf,
  type DraftForm,
} from "../invoices-model";
import type { InvoiceContext } from "../invoices-view-schema";
import { AmountFields, FormFeedback, InvoiceFields } from "./i3-fields";
import { CoveragePreview, WarningsList } from "./i3-preview";

// Βήμα 1: το PDF ανεβαίνει μαζί με τη φόρμα. Τα στοιχεία τα γράφει ο Χρήστης (Π3: χωρίς ανάγνωση από AI).
function PdfStep({ onFile }: { onFile: (name: string) => void }) {
  return (
    <Panel label="Βήμα 1: Ανέβασμα PDF">
      <div className="toolbar">
        <input
          className="input"
          type="file"
          name="pdf"
          accept="application/pdf"
          onChange={(e) => onFile(e.target.files?.[0]?.name ?? "")}
        />
      </div>
      <p className="note">Έως 4 MB. Τα στοιχεία τα γράφεις στο επόμενο βήμα.</p>
    </Panel>
  );
}

function SubmitBar(props: {
  form: DraftForm;
  ctx: InvoiceContext;
  isDisabled: boolean;
  isPending: boolean;
  error?: string;
  onChange: (change: Partial<DraftForm>) => void;
}) {
  const { form, ctx, onChange } = props;
  return (
    <>
      {hasTaxMismatch(form, ctx) && (
        <label className="i13-check">
          <input
            type="checkbox"
            name="taxIdConfirmed"
            checked={form.taxIdConfirmed}
            onChange={(e) => onChange({ taxIdConfirmed: e.target.checked })}
          />
          <span>Το επιβεβαίωσα: το ΑΦΜ του PDF είναι σωστό παρά τη διαφορά.</span>
        </label>
      )}
      <p className="note">
        Η καταχώριση στέλνει email με το PDF σε όλους τους Χρήστες του Πελάτη με «Βλέπει Οικονομικά».
        Δεν παραλείπεται.
      </p>
      <FormFeedback error={props.error} />
      <button
        type="submit"
        className="button"
        data-primary="true"
        disabled={props.isDisabled || props.isPending}
      >
        {props.isPending ? "Αποθήκευση…" : "Επιβεβαίωση και καταχώρηση"}
      </button>
    </>
  );
}

function DoneNotice({ notice, onAgain }: { notice: string; onAgain: () => void }) {
  return (
    <div className="i13-done-wrap" role="status">
      <Panel label={notice}>
        <p className="i13-wrap">
          Καταχωρήθηκε. Email με το PDF φεύγει σε όλους τους Χρήστες του Πελάτη με «Βλέπει Οικονομικά».
        </p>
        <button type="button" className="button" onClick={onAgain}>
          Νέα καταχώριση
        </button>
      </Panel>
    </div>
  );
}

// Ο πάγκος Καταχώρησης του prototype (`screens/i3-workbench.tsx`) πάνω στην πραγματική ενέργεια registerInvoice.
export function I3Workbench({ clientId, ctx, today }: { clientId: string; ctx: InvoiceContext; today: string }) {
  const empty = useMemo(() => emptyDraft(today), [today]);
  const [form, setForm] = useState<DraftForm>(empty);
  const [fileName, setFileName] = useState("");
  const { state, isPending, onSubmit, formRef } = useKeptForm(registerInvoice, { resetOnSuccess: true });
  // Μετά την επιτυχία φαίνεται το «Καταχωρήθηκε» μέχρι ο Χρήστης να ζητήσει νέα καταχώριση.
  const [dismissed, setDismissed] = useState<typeof state | null>(null);
  const handleChange = (change: Partial<DraftForm>) => setForm((prev) => ({ ...prev, ...change }));
  const handleAgain = () => {
    setDismissed(state);
    setForm(empty);
    setFileName("");
  };
  if (state.notice && state !== dismissed) return <DoneNotice notice={state.notice} onAgain={handleAgain} />;
  return (
    <div className="i13-layout">
      <form ref={formRef} onSubmit={onSubmit} className="stack" style={{ width: "100%" }}>
        <input type="hidden" name="clientId" value={clientId} />
        <PdfStep onFile={setFileName} />
        <Panel label="Βήμα 2: Στοιχεία">
          <InvoiceFields form={form} ctx={ctx} onChange={handleChange} />
          <AmountFields form={form} ctx={ctx} onChange={handleChange} onReplace={setForm} />
          <WarningsList warnings={warningsOf(form, ctx)} />
          <SubmitBar
            form={form}
            ctx={ctx}
            isDisabled={!canSubmit(form, ctx, fileName !== "")}
            isPending={isPending}
            error={state.error}
            onChange={handleChange}
          />
        </Panel>
      </form>
      <CoveragePreview
        open={ctx.openBillables}
        net={amountOf(form.net)}
        isCredit={form.kind === "credit"}
        toInvoice={ctx.toInvoice}
      />
    </div>
  );
}
