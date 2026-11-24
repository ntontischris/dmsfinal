"use client";

import Link from "next/link";

import { useKeptForm } from "@/lib/use-kept-form";

import { openToClients } from "../actions";

// «Άνοιγμα τώρα»: θέλει να γραφτεί η λέξη ΑΝΟΙΓΜΑ, για να μη γίνει κατά λάθος (το ελέγχει και το action).
export function OpenForm({ cancelHref }: { cancelHref: string }) {
  const { state, isPending, onSubmit, formRef } = useKeptForm(openToClients);
  return (
    <form ref={formRef} onSubmit={onSubmit}>
      <span className="ml-field o-field">
        <label htmlFor="o7-confirm">Γράψε ΑΝΟΙΓΜΑ για επιβεβαίωση</label>
        <input
          id="o7-confirm"
          name="confirm"
          className="input"
          autoComplete="off"
        />
      </span>
      {state.error && (
        <p className="note" role="alert">
          {state.error}
        </p>
      )}
      <div className="ml-actions">
        <Link href={cancelHref}>Άκυρο</Link>
        <button type="submit" data-danger="true" disabled={isPending}>
          {isPending ? "Άνοιγμα…" : "Άνοιγμα τώρα"}
        </button>
      </div>
    </form>
  );
}
