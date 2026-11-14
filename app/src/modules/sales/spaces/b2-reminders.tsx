"use client";

import { useState } from "react";

import { useKeptForm } from "@/lib/use-kept-form";

import { addReminder, completeReminder } from "../actions-client-care";
import { formatDate } from "../helpers";
import type { ClientReminder } from "../types";

interface ClientRemindersProps {
  clientId: string;
  reminders: readonly ClientReminder[];
}

function DoneButton({ reminderId }: { reminderId: string }) {
  const { state, isPending, onSubmit } = useKeptForm(completeReminder);
  return (
    <form onSubmit={onSubmit} style={{ display: "inline" }}>
      <input type="hidden" name="reminderId" value={reminderId} />
      <button type="submit" className="button" disabled={isPending}>
        Έγινε
      </button>
      {state.error && (
        <span className="note" role="alert">
          {state.error}
        </span>
      )}
    </form>
  );
}

function AddForm({
  clientId,
  onClose,
}: {
  clientId: string;
  onClose: () => void;
}) {
  const { state, isPending, onSubmit, formRef } = useKeptForm(addReminder);
  const [handled, setHandled] = useState(state);
  // Επιτυχία: η φόρμα κλείνει (ενημέρωση κατά το render, όχι effect).
  if (state !== handled) {
    setHandled(state);
    if (state.notice) onClose();
  }
  return (
    <form ref={formRef} className="stack" onSubmit={onSubmit}>
      <input type="hidden" name="clientId" value={clientId} />
      <label className="field">
        <span>Πότε</span>
        <input className="input" type="date" name="remindOn" required />
      </label>
      <label className="field">
        <span>Τι να σου θυμίσω</span>
        <input className="input" name="note" maxLength={300} required />
      </label>
      {state.error && (
        <p className="note" role="alert">
          {state.error}
        </p>
      )}
      <span className="btn-row">
        <button
          type="submit"
          className="button"
          data-primary="true"
          disabled={isPending}
        >
          Αποθήκευση
        </button>
        <button type="button" className="button" onClick={onClose}>
          Άκυρο
        </button>
      </span>
    </form>
  );
}

// «Υπενθύμισέ με» (b7): προσωπικές υπενθυμίσεις του Χρήστη για τον Πελάτη. Από τη μέρα τους εμφανίζονται στο Σήμερα
// («Υπενθυμίσεις μου») μέχρι να πατηθεί «Έγινε».
export function ClientReminders({ clientId, reminders }: ClientRemindersProps) {
  const [isAdding, setIsAdding] = useState(false);
  return (
    <>
      {reminders.length === 0 && !isAdding && (
        <p className="muted b2-line">Καμία υπενθύμιση.</p>
      )}
      {reminders.length > 0 && (
        <ul className="stack" aria-label="Οι υπενθυμίσεις μου">
          {reminders.map((reminder) => (
            <li key={reminder.id} className="b2-line">
              <span className="num">{formatDate(reminder.remindOn)}</span> ·{" "}
              {reminder.note} <DoneButton reminderId={reminder.id} />
            </li>
          ))}
        </ul>
      )}
      {isAdding ? (
        <AddForm clientId={clientId} onClose={() => setIsAdding(false)} />
      ) : (
        <button
          type="button"
          className="button"
          onClick={() => setIsAdding(true)}
        >
          Υπενθύμισέ με
        </button>
      )}
    </>
  );
}
