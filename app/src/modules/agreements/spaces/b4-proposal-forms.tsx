"use client";

import { useState } from "react";

import { createAgreement } from "../actions-draft";
import { requestApproval, sendProposal } from "../actions-flow";
import { KIND_LABELS } from "../labels";
import { SpacesActionForm, SpacesField } from "./spaces-form";

// «Νέα πρόταση» της Σελίδας Ευκαιρίας: ανοίγει τη φόρμα επί τόπου και η πραγματική ενέργεια πηγαίνει στη Σελίδα Συμφωνίας.
export function CreateProposal({
  opportunityId,
  defaultTitle,
}: {
  opportunityId: string;
  defaultTitle: string;
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
        Νέα πρόταση
      </button>
    );
  return (
    <SpacesActionForm action={createAgreement} submitLabel="Σύνταξη πρότασης">
      <input type="hidden" name="opportunityId" value={opportunityId} />
      <SpacesField label="Είδος">
        <select className="select" name="kind" defaultValue="">
          <option value="">Διάλεξε…</option>
          <option value="monthly">{KIND_LABELS.monthly}</option>
          <option value="one_off">{KIND_LABELS.one_off}</option>
        </select>
      </SpacesField>
      <SpacesField label="Τίτλος">
        <input
          className="input"
          name="title"
          defaultValue={defaultTitle}
          autoComplete="off"
        />
      </SpacesField>
      <p className="muted">
        Η Συμφωνία γράφεται στη σελίδα της: γραμμές από τον Κατάλογο, Όροι από
        τις Ρυθμίσεις.
      </p>
    </SpacesActionForm>
  );
}

// Αποστολή ή Αίτημα έγκρισης κατευθείαν από την Ευκαιρία, όταν η πρόταση έχει γραμμές.
export function ProposalQuickAction({
  agreementId,
  needsApproval,
}: {
  agreementId: string;
  needsApproval: boolean;
}) {
  return (
    <SpacesActionForm
      action={needsApproval ? requestApproval : sendProposal}
      submitLabel={needsApproval ? "Αίτημα έγκρισης" : "Αποστολή"}
      isPrimary={!needsApproval}
      className="btn-row"
    >
      <input type="hidden" name="agreementId" value={agreementId} />
    </SpacesActionForm>
  );
}
