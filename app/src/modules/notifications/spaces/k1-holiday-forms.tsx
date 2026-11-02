"use client";

import { useState } from "react";

import { useKeptForm } from "@/lib/use-kept-form";

import {
  addHoliday,
  removeHoliday,
  toggleHoliday,
} from "../actions-automations";
import { KMessage } from "./k-form";

// Οι φόρμες των Αργιών στο ύφος του prototype (`k1-holidays.tsx`): διακόπτης «Ενεργή», σβήσιμο δικής σου, προσθήκη.

export function HolidaySwitch({
  name,
  isOn,
  label,
}: {
  name: string;
  isOn: boolean;
  label: string;
}) {
  const { state, isPending, onSubmit, formRef } = useKeptForm(toggleHoliday);
  return (
    <form ref={formRef} onSubmit={onSubmit}>
      <input type="hidden" name="name" value={name} />
      <label className="k1-switch">
        <input
          type="checkbox"
          name="isOn"
          defaultChecked={isOn}
          disabled={isPending}
          aria-label={`Ενεργή: ${label}`}
          onChange={(event) => event.currentTarget.form?.requestSubmit()}
        />
        Ενεργή
      </label>
      {state.error && (
        <span className="k1-error" role="alert">
          {state.error}
        </span>
      )}
    </form>
  );
}

export function HolidayRemove({ id, label }: { id: string; label: string }) {
  const { state, isPending, onSubmit, formRef } = useKeptForm(removeHoliday);
  return (
    <form ref={formRef} onSubmit={onSubmit}>
      <input type="hidden" name="id" value={id} />
      <button
        className="button"
        data-danger="true"
        type="submit"
        disabled={isPending}
        aria-label={`Σβήσιμο: ${label}`}
      >
        Σβήσιμο
      </button>
      {state.error && (
        <span className="k1-error" role="alert">
          {state.error}
        </span>
      )}
    </form>
  );
}

// Το «Προσθήκη αργίας» της κεφαλίδας ανοίγει τη φόρμα κάτω από τη λίστα.
export function HolidayAdd() {
  const [isOpen, setIsOpen] = useState(false);
  const { state, isPending, onSubmit, formRef } = useKeptForm(addHoliday, {
    resetOnSuccess: true,
  });
  if (!isOpen)
    return (
      <button className="button" type="button" onClick={() => setIsOpen(true)}>
        Προσθήκη αργίας
      </button>
    );
  return (
    <form
      ref={formRef}
      onSubmit={onSubmit}
      className="k1-holiday"
      aria-label="Προσθήκη αργίας"
    >
      <input
        className="input"
        name="name"
        maxLength={80}
        required
        placeholder="Όνομα αργίας"
        aria-label="Όνομα αργίας"
      />
      <input
        className="input"
        name="date"
        type="date"
        required
        aria-label="Ημερομηνία"
      />
      <label className="k1-switch">
        <input type="checkbox" name="yearly" defaultChecked />
        Κάθε χρόνο
      </label>
      <span className="btn-row">
        <button
          className="button"
          data-primary="true"
          type="submit"
          disabled={isPending}
        >
          Προσθήκη αργίας
        </button>
        <button
          className="button"
          type="button"
          onClick={() => setIsOpen(false)}
        >
          Ακύρωση
        </button>
      </span>
      <KMessage state={state} />
    </form>
  );
}
