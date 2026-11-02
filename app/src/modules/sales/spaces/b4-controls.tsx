"use client";

import Link from "next/link";
import { useState } from "react";

import { useKeptForm } from "@/lib/use-kept-form";

import {
  closeOpportunityLost,
  followUpOpportunity,
  logActivity,
  moveOpportunityStage,
  updateOpportunity,
} from "../actions-opportunities";
import type { ListItem } from "../types";
import { SAID_YES_TEXT, saidYesNotice } from "./b4-said-yes";
import { SpacesActionForm, SpacesField } from "./spaces-form";

// Τα κομμάτια της Σελίδας Ευκαιρίας (prototype `screens/b4-workbench.tsx`) που γράφουν: το καθένα με την πραγματική ενέργεια.

export function StageSelect({
  opportunityId,
  stageId,
  stages,
}: {
  opportunityId: string;
  stageId: string;
  stages: readonly ListItem[];
}) {
  const { state, isPending, onSubmit, formRef } =
    useKeptForm(moveOpportunityStage);
  // Μια αποσυρμένη τιμή μένει επιλέξιμη μόνο αν την έχει ήδη η Ευκαιρία.
  const selectable = stages.filter(
    (stage) => !stage.isRetired || stage.id === stageId,
  );
  return (
    <form ref={formRef} onSubmit={onSubmit} className="btn-row">
      <input type="hidden" name="opportunityId" value={opportunityId} />
      <select
        className="select"
        aria-label="Στάδιο"
        name="stageId"
        defaultValue={stageId}
        disabled={isPending}
        onChange={(event) => event.currentTarget.form?.requestSubmit()}
      >
        {selectable.map((stage) => (
          <option key={stage.id} value={stage.id}>
            {stage.label}
          </option>
        ))}
      </select>
      {state.error && (
        <span className="note" role="alert">
          {state.error}
        </span>
      )}
    </form>
  );
}

interface NextStepProps {
  opportunityId: string;
  title: string;
  stageId: string;
  nextStep: string;
  nextStepDue: string | null;
  // «Ξεχασμένη»: πέρασε η ημερομηνία.
  isOverdue: boolean;
  dueText: string | null;
}

export function NextStepEditor({
  opportunityId,
  title,
  stageId,
  nextStep,
  nextStepDue,
  isOverdue,
  dueText,
}: NextStepProps) {
  const [isEditing, setIsEditing] = useState(false);
  const hasStep = nextStep !== "" && nextStepDue !== null;
  if (isEditing)
    return (
      <SpacesActionForm
        action={updateOpportunity}
        submitLabel="Αποθήκευση"
        className="toolbar"
      >
        <input type="hidden" name="opportunityId" value={opportunityId} />
        <input type="hidden" name="title" value={title} />
        <input type="hidden" name="stageId" value={stageId} />
        <input
          className="input grow"
          name="nextStep"
          aria-label="Τι θα κάνεις"
          placeholder="π.χ. Κλήση για απάντηση"
          defaultValue={nextStep}
          autoComplete="off"
        />
        <input
          className="input"
          type="date"
          name="nextStepDue"
          aria-label="Πότε (υπενθύμιση)"
          defaultValue={nextStepDue ?? ""}
        />
      </SpacesActionForm>
    );
  return (
    <>
      {hasStep ? (
        <>
          {nextStep}, {dueText}{" "}
          {isOverdue && (
            <span className="badge" data-tone="attention">
              Ξεχασμένη
            </span>
          )}
        </>
      ) : (
        <span className="badge" data-tone="attention">
          Δεν έχει οριστεί (είναι υποχρεωτικό)
        </span>
      )}{" "}
      <button
        type="button"
        className="button"
        onClick={() => setIsEditing(true)}
      >
        {hasStep ? "Αλλαγή" : "Όρισε επόμενο βήμα"}
      </button>
    </>
  );
}

// «Είπε ναι — ετοίμασε Συμφωνία»: γράφει Δραστηριότητα· η Ευκαιρία μένει ανοιχτή μέχρι την υπογραφή (ADR 0009).
export function SaidYes({
  opportunityId,
  kindId,
  hasProposal,
  proposalHref,
}: {
  opportunityId: string;
  kindId: string | null;
  hasProposal: boolean;
  proposalHref: string;
}) {
  const { state, isPending, onSubmit, formRef } = useKeptForm(logActivity);
  if (state.notice)
    return (
      <div className="note" role="status">
        <p>{saidYesNotice(hasProposal)}</p>
        <Link className="button" data-primary="true" href={proposalHref}>
          {hasProposal
            ? "Άνοιξε την πρόταση για υπογραφή"
            : "Άνοιξε τη νέα πρόταση"}
        </Link>
      </div>
    );
  if (kindId === null) return null;
  return (
    <form ref={formRef} onSubmit={onSubmit} className="btn-row">
      <input type="hidden" name="opportunityId" value={opportunityId} />
      <input type="hidden" name="kindId" value={kindId} />
      <input type="hidden" name="body" value={SAID_YES_TEXT} />
      <button
        type="submit"
        className="button"
        data-primary="true"
        disabled={isPending}
      >
        Είπε ναι — ετοίμασε Συμφωνία
      </button>
      {state.error && (
        <span className="note" role="alert">
          {state.error}
        </span>
      )}
    </form>
  );
}

export function CloseLost({
  opportunityId,
  reasons,
}: {
  opportunityId: string;
  reasons: readonly ListItem[];
}) {
  const [isOpen, setIsOpen] = useState(false);
  const active = reasons.filter((reason) => !reason.isRetired);
  if (!isOpen)
    return (
      <button type="button" className="button" onClick={() => setIsOpen(true)}>
        Κλείσιμο ως χαμένη
      </button>
    );
  return (
    <SpacesActionForm
      action={closeOpportunityLost}
      submitLabel="Κλείσιμο ως χαμένη"
      isPrimary={false}
    >
      <input type="hidden" name="opportunityId" value={opportunityId} />
      <SpacesField label="Λόγος απώλειας">
        <select className="select" name="lossReasonId" defaultValue="">
          <option value="" disabled>
            Διάλεξε Λόγο απώλειας
          </option>
          {active.map((reason) => (
            <option key={reason.id} value={reason.id}>
              {reason.label}
            </option>
          ))}
        </select>
      </SpacesField>
    </SpacesActionForm>
  );
}

// «Νέα Ευκαιρία από αυτήν»: μια χαμένη Ευκαιρία δεν ξανανοίγει· η νέα έχει σύνδεσμο σε αυτήν.
export function FollowUp({
  lostId,
  title,
  sourceId,
  defaultDue,
}: {
  lostId: string;
  title: string;
  sourceId: string;
  defaultDue: string;
}) {
  const [isOpen, setIsOpen] = useState(false);
  if (!isOpen)
    return (
      <button
        type="button"
        className="button"
        data-primary="true"
        onClick={() => setIsOpen(true)}
      >
        Νέα Ευκαιρία από αυτήν
      </button>
    );
  return (
    <SpacesActionForm
      action={followUpOpportunity}
      submitLabel="Άνοιγμα νέας Ευκαιρίας"
    >
      <input type="hidden" name="lostId" value={lostId} />
      <input type="hidden" name="sourceId" value={sourceId} />
      <SpacesField label="Τι αφορά">
        <input
          className="input"
          name="title"
          defaultValue={title}
          autoComplete="off"
        />
      </SpacesField>
      <SpacesField label="Επόμενο βήμα">
        <input
          className="input"
          name="nextStep"
          autoComplete="off"
        />
      </SpacesField>
      <SpacesField label="Πότε (υπενθύμιση)">
        <input
          className="input"
          type="date"
          name="nextStepDue"
          defaultValue={defaultDue}
        />
      </SpacesField>
    </SpacesActionForm>
  );
}
