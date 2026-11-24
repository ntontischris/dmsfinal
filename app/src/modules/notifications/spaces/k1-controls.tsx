"use client";

import { useState } from "react";

import { useKeptForm } from "@/lib/use-kept-form";

import { deleteAutomation, setAutomationEnabled } from "../actions-automations";
import {
  DELETE_CONFIRM,
  DELETE_LABEL,
  ENABLED_LABEL,
} from "../automation-labels";
import type { EventPage } from "../automation-view-schema";
import { KMessage } from "./k-form";
import { K1AutomationForm } from "./k1-form";

// Ο διακόπτης «Ενεργός» (πάνω στο κουτί του Αυτοματισμού), η διαγραφή σε δύο βήματα και η «Προσθήκη Αυτοματισμού».

export function EnabledSwitch({
  id,
  isEnabled,
}: {
  id: string;
  isEnabled: boolean;
}) {
  const { state, isPending, onSubmit, formRef } =
    useKeptForm(setAutomationEnabled);
  return (
    <form ref={formRef} onSubmit={onSubmit}>
      <input type="hidden" name="id" value={id} />
      <label className="k1-switch">
        <input
          type="checkbox"
          name="isEnabled"
          defaultChecked={isEnabled}
          disabled={isPending}
          onChange={(event) => event.currentTarget.form?.requestSubmit()}
        />
        {ENABLED_LABEL}
      </label>
      {state.error && (
        <span className="k1-error" role="alert">
          {state.error}
        </span>
      )}
      {state.notice && (
        <span className="note" role="status">
          {state.notice}
        </span>
      )}
    </form>
  );
}

export function DeleteAutomation({ id }: { id: string }) {
  const [isConfirming, setIsConfirming] = useState(false);
  const { state, isPending, onSubmit, formRef } = useKeptForm(deleteAutomation);
  return (
    <form ref={formRef} onSubmit={onSubmit}>
      <input type="hidden" name="id" value={id} />
      {/* Διαφορετικά keys: αλλιώς η React ξαναχρησιμοποιεί το ίδιο κουμπί και διαγράφει χωρίς επιβεβαίωση. */}
      <div className="ml-actions">
        {isConfirming ? (
          <button
            key="confirm"
            data-danger="true"
            type="submit"
            disabled={isPending}
          >
            {DELETE_CONFIRM}
          </button>
        ) : (
          <button
            key="ask"
            data-danger="true"
            type="button"
            onClick={() => setIsConfirming(true)}
          >
            {DELETE_LABEL}
          </button>
        )}
      </div>
      <KMessage state={state} />
    </form>
  );
}

export function NewAutomation({ page }: { page: EventPage }) {
  const [isOpen, setIsOpen] = useState(false);
  if (!isOpen)
    return (
      <div className="ml-actions">
        <button
          data-primary="true"
          type="button"
          onClick={() => setIsOpen(true)}
        >
          Προσθήκη Αυτοματισμού
        </button>
      </div>
    );
  return (
    <details className="ml-new ml-box" open>
      <summary>
        <h2 className="ml-box-title">Νέος Αυτοματισμός</h2>
        <small>παραλήπτες, πότε και κείμενο</small>
      </summary>
      <div className="ml-quick k1-left">
        <button type="button" onClick={() => setIsOpen(false)}>
          Ακύρωση
        </button>
      </div>
      <div className="k1-auto">
        <K1AutomationForm
          page={page}
          automation={null}
          onSuccess={() => setIsOpen(false)}
        />
      </div>
    </details>
  );
}
