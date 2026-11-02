"use client";

import { useState } from "react";

import { useKeptForm } from "@/lib/use-kept-form";

import { deleteBlockedTime } from "../actions-blocked";

// Διαγραφή με επιβεβαίωση, στο σχήμα του prototype (`screens/a6-list.tsx` › DeleteConfirm), με το πραγματικό deleteBlockedTime.

interface A6DeleteProps {
  id: string;
  day: string;
  label: string;
}

export function A6Delete({ id, day, label }: A6DeleteProps) {
  const [isConfirming, setIsConfirming] = useState(false);
  const { state, isPending, onSubmit, formRef } =
    useKeptForm(deleteBlockedTime);
  return (
    <form ref={formRef} onSubmit={onSubmit}>
      <input type="hidden" name="id" value={id} />
      <input type="hidden" name="day" value={day} />
      {isConfirming ? (
        <div className="a6-confirm" role="alertdialog">
          <span>Να διαγραφεί ο «{label}»; Δεν αναιρείται.</span>
          <span className="a6-actions">
            <button
              className="button"
              data-danger="true"
              type="submit"
              disabled={isPending}
            >
              {isPending ? "Διαγραφή…" : "Διαγραφή"}
            </button>
            <button
              className="button"
              type="button"
              onClick={() => setIsConfirming(false)}
            >
              Άκυρο
            </button>
          </span>
        </div>
      ) : (
        <button
          className="button"
          data-danger="true"
          type="button"
          onClick={() => setIsConfirming(true)}
        >
          Διαγραφή
        </button>
      )}
      {state.error && (
        <p className="a6-error" role="alert">
          {state.error}
        </p>
      )}
    </form>
  );
}
