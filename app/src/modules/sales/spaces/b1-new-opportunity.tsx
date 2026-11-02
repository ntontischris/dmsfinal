"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";

import type { FormState } from "@/lib/form-state";
import { useKeptForm } from "@/lib/use-kept-form";

import { requestAccess } from "../actions-clients";
import { createOpportunity } from "../actions-opportunities";
import { athensToday, takenMessage } from "../helpers";
import type { ListItem, PickerClient } from "../types";

type Mode = "new" | "existing";
type Action = (state: FormState, form: FormData) => Promise<FormState>;

const DAY_MS = 86_400_000;
const addDays = (isoDate: string, days: number): string =>
  new Date(Date.parse(`${isoDate}T00:00:00Z`) + days * DAY_MS)
    .toISOString()
    .slice(0, 10);

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="field">
      <span>{label}</span>
      {children}
    </label>
  );
}

// Η φόρμα του prototype (`.new-lead`) πάνω στην πραγματική ενέργεια· κρατά ό,τι γράφτηκε αν η βάση πει όχι.
function LeadForm({
  action,
  submitLabel,
  children,
}: {
  action: Action;
  submitLabel: string;
  children: ReactNode;
}) {
  const { state, isPending, onSubmit, formRef } = useKeptForm(action);
  return (
    <form ref={formRef} className="new-lead" onSubmit={onSubmit}>
      {children}
      {state.error && (
        <ul className="note" role="alert">
          <li>{state.error}</li>
        </ul>
      )}
      {state.notice && (
        <p className="note" role="status">
          {state.notice}
        </p>
      )}
      <button
        type="submit"
        className="button"
        data-primary="true"
        disabled={isPending}
      >
        {submitLabel}
      </button>
    </form>
  );
}

function SourceField({ sources }: { sources: readonly ListItem[] }) {
  return (
    <Field label="Πηγή">
      <select className="select" name="sourceId" defaultValue="">
        <option value="" disabled>
          Διάλεξε Πηγή
        </option>
        {sources.map((source) => (
          <option key={source.id} value={source.id}>
            {source.label}
          </option>
        ))}
      </select>
    </Field>
  );
}

// Τι ζητάει, από πού ήρθε και το Επόμενο βήμα: όσα θέλει κάθε Ευκαιρία (ADR 0009).
function OpportunityFields({ sources }: { sources: readonly ListItem[] }) {
  return (
    <>
      <Field label="Τι ζητάει">
        <textarea className="input" name="title" rows={2} />
      </Field>
      <SourceField sources={sources} />
      <input type="hidden" name="referredBy" value="" />
      <Field label="Επόμενο βήμα">
        <input className="input" name="nextStep" autoComplete="off" />
      </Field>
      <Field label="Ημερομηνία επόμενου βήματος">
        <input
          className="input"
          type="date"
          name="nextStepDue"
          defaultValue={addDays(athensToday(), 3)}
        />
      </Field>
    </>
  );
}

function NewClientForm({ sources }: { sources: readonly ListItem[] }) {
  return (
    <LeadForm
      action={createOpportunity}
      submitLabel="Δημιουργία Πελάτη και Ευκαιρίας"
    >
      <input type="hidden" name="clientId" value="" />
      <Field label="Όνομα πελάτη ή επιχείρησης">
        <input className="input" name="name" autoComplete="off" />
      </Field>
      <Field label="Κύριο πρόσωπο">
        <input className="input" name="contactName" autoComplete="off" />
      </Field>
      <Field label="Τηλέφωνο">
        <input
          className="input"
          type="tel"
          name="contactPhone"
          autoComplete="off"
        />
      </Field>
      <Field label="Email">
        <input
          className="input"
          type="email"
          name="contactEmail"
          autoComplete="off"
        />
      </Field>
      {["legalName", "city", "afm"].map((name) => (
        <input key={name} type="hidden" name={name} value="" />
      ))}
      <OpportunityFields sources={sources} />
    </LeadForm>
  );
}

function ExistingClientForm({
  clients,
  sources,
}: {
  clients: readonly PickerClient[];
  sources: readonly ListItem[];
}) {
  const [choice, setChoice] = useState("");
  const client = clients.find((candidate) => candidate.id === choice);
  return (
    <div className="new-lead">
      <select
        className="select"
        aria-label="Πελάτης της Ευκαιρίας"
        value={choice}
        onChange={(event) => setChoice(event.target.value)}
      >
        <option value="" disabled>
          Διάλεξε Πελάτη
        </option>
        {clients.map((candidate) => (
          <option key={candidate.id} value={candidate.id}>
            {candidate.name}
            {candidate.isMine ? "" : " (άλλου πωλητή)"}
          </option>
        ))}
      </select>
      {client?.isMine && (
        <LeadForm
          key={client.id}
          action={createOpportunity}
          submitLabel="Δημιουργία Ευκαιρίας"
        >
          <p className="note" role="status">
            Η Ευκαιρία ανοίγει στον Πελάτη σου «{client.name}».
          </p>
          <input type="hidden" name="clientId" value={client.id} />
          <OpportunityFields sources={sources} />
        </LeadForm>
      )}
      {client && !client.isMine && (
        <div className="note" role="alert">
          <p>{takenMessage(client.managerName)}</p>
          <LeadForm
            key={client.id}
            action={requestAccess}
            submitLabel="Αίτημα πρόσβασης"
          >
            <input type="hidden" name="clientId" value={client.id} />
            <Field label="Τι αφορά">
              <input className="input" name="topic" autoComplete="off" />
            </Field>
            <Field label="Σχόλιο">
              <input className="input" name="comment" autoComplete="off" />
            </Field>
            <SourceField sources={sources} />
          </LeadForm>
        </div>
      )}
    </div>
  );
}

// «Νέος Πελάτης / Ευκαιρία» (prototype `screens/b1-new-opportunity.tsx`): μία φόρμα, με νέο πελάτη από προεπιλογή
// (ο συνηθισμένος δρόμος είναι ένα τηλεφώνημα). Δημιουργεί με τις πραγματικές ενέργειες και ανοίγει την Ευκαιρία.
export function NewOpportunity({
  clients,
  sources,
  isOpenAtStart = false,
}: {
  clients: readonly PickerClient[];
  sources: readonly ListItem[];
  isOpenAtStart?: boolean;
}) {
  const [mode, setMode] = useState<Mode | null>(isOpenAtStart ? "new" : null);
  const formRef = useRef<HTMLElement>(null);
  const isOpen = mode !== null;
  const activeSources = sources.filter((source) => !source.isRetired);
  // Η φόρμα έρχεται στο μάτι και παίρνει το πρώτο πεδίο, ώστε να μη μένει κρυμμένη πιο κάτω.
  useEffect(() => {
    if (!isOpen) return;
    formRef.current?.scrollIntoView({ block: "start", behavior: "smooth" });
    formRef.current
      ?.querySelector<HTMLInputElement>("input:not([type=hidden]), select")
      ?.focus({ preventScroll: true });
  }, [isOpen]);
  return (
    <>
      <button
        type="button"
        className="button"
        data-primary="true"
        onClick={() => setMode(mode ? null : "new")}
      >
        Νέος Πελάτης / Ευκαιρία
      </button>
      {mode && (
        <section ref={formRef} className="card" style={{ flexBasis: "100%" }}>
          <h2>
            {mode === "new"
              ? "Νέος πελάτης και Ευκαιρία"
              : "Νέα Ευκαιρία σε υπάρχοντα Πελάτη"}
          </h2>
          <div className="choice-row" role="group" aria-label="Τι πελάτης">
            <button
              type="button"
              className="button"
              aria-pressed={mode === "new"}
              onClick={() => setMode("new")}
            >
              Νέος πελάτης
            </button>
            <button
              type="button"
              className="button"
              aria-pressed={mode === "existing"}
              onClick={() => setMode("existing")}
            >
              Υπάρχων πελάτης
            </button>
          </div>
          {mode === "new" ? (
            <NewClientForm sources={activeSources} />
          ) : (
            <ExistingClientForm clients={clients} sources={activeSources} />
          )}
        </section>
      )}
    </>
  );
}
