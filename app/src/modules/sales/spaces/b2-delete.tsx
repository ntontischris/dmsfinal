"use client";

import { useState } from "react";

import { useKeptForm } from "@/lib/use-kept-form";

import { deleteClient } from "../actions-clients";
import { SpacesField } from "./spaces-form";

interface ClientDeleteProps {
  clientId: string;
  clientName: string;
  // Ο λόγος που ο Πελάτης δεν σβήνεται (από τη βάση), ή null.
  block: string | null;
}

// «Διαγραφή Πελάτη» της πλαϊνής στήλης, για Πελάτη που μπήκε κατά λάθος. Μόνο για όποιον «Διαγράφει Πελάτες».
// Με δουλειά ή χρήμα δεν σβήνεται: δείχνει τον λόγο. Αλλιώς ζητά το όνομα, και η βάση το ξαναελέγχει.
export function ClientDelete({
  clientId,
  clientName,
  block,
}: ClientDeleteProps) {
  const [isConfirming, setIsConfirming] = useState(false);
  const [typed, setTyped] = useState("");
  const { state, isPending, onSubmit, formRef } = useKeptForm(deleteClient);
  if (block !== null)
    return (
      <>
        <button type="button" className="button" data-danger disabled>
          Διαγραφή Πελάτη
        </button>
        <p className="muted">Δεν σβήνεται: {block}.</p>
      </>
    );
  if (!isConfirming)
    return (
      <button
        type="button"
        className="button"
        data-danger
        onClick={() => setIsConfirming(true)}
      >
        Διαγραφή Πελάτη
      </button>
    );
  return (
    <form
      ref={formRef}
      className="stack"
      onSubmit={onSubmit}
      role="alertdialog"
      aria-label={`Διαγραφή Πελάτη: ${clientName}`}
    >
      <input type="hidden" name="clientId" value={clientId} />
      <p className="note">
        Σβήνεται ο «{clientName}» μαζί με τις Ευκαιρίες και τις Δραστηριότητές
        του. Δεν αναιρείται.
      </p>
      <SpacesField label={`Γράψε «${clientName}» για επιβεβαίωση`}>
        <input
          className="input"
          name="confirmName"
          autoComplete="off"
          value={typed}
          onChange={(event) => setTyped(event.target.value)}
        />
      </SpacesField>
      {state.error && (
        <ul className="note" role="alert">
          <li>{state.error}</li>
        </ul>
      )}
      <span className="btn-row">
        <button
          type="submit"
          className="button"
          data-danger
          disabled={isPending || typed.trim() !== clientName.trim()}
        >
          {isPending ? "Διαγραφή…" : "Διαγραφή"}
        </button>
        <button
          type="button"
          className="button"
          onClick={() => setIsConfirming(false)}
        >
          Άκυρο
        </button>
      </span>
    </form>
  );
}
