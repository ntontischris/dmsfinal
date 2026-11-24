"use client";

import Link from "next/link";
import { useState } from "react";

import { useKeptForm } from "@/lib/use-kept-form";

import { anonymizeSubject } from "../actions";
import { ERASED_TEXT, KEPT_TEXT } from "../labels";
import type { PersonKind } from "../schemas";
import { GdprConfirmCard } from "./gdpr-parts";

interface AnonymizeConfirmProps {
  subjectKind: PersonKind;
  subjectId: string;
  name: string;
  // Στη N1 η επιβεβαίωση είναι δική της διεύθυνση (backHref)· στη B2 ανοίγει στη θέση της (onCancel).
  backHref?: string;
  onCancel?: () => void;
}

function BackControl({
  backHref,
  onCancel,
  label,
}: {
  backHref?: string;
  onCancel?: () => void;
  label: string;
}) {
  if (backHref) return <Link href={backHref}>{label}</Link>;
  if (!onCancel) return null;
  return (
    <button type="button" onClick={onCancel}>
      {label}
    </button>
  );
}

// Η επιβεβαίωση της Ανωνυμοποίησης (prototype `screens/n1-gdpr.tsx`), με την πραγματική ενέργεια. Το κουμπί ανοίγει
// μόνο όταν το όνομα ταιριάζει ακριβώς· η βάση το ξαναελέγχει.
export function AnonymizeConfirm({
  subjectKind,
  subjectId,
  name,
  backHref,
  onCancel,
}: AnonymizeConfirmProps) {
  const { state, isPending, onSubmit, formRef } = useKeptForm(anonymizeSubject);
  const [typed, setTyped] = useState("");
  if (state.notice)
    return (
      <GdprConfirmCard title={`Ανωνυμοποίηση: ${name}`} role="status">
        <p>{state.notice}</p>
        {backHref && (
          <div className="ml-actions">
            <Link href={backHref}>Πίσω στον Χρήστη</Link>
          </div>
        )}
      </GdprConfirmCard>
    );
  return (
    <GdprConfirmCard title={`Ανωνυμοποίηση: ${name}`}>
      <form ref={formRef} onSubmit={onSubmit}>
        <input type="hidden" name="subjectKind" value={subjectKind} />
        <input type="hidden" name="subjectId" value={subjectId} />
        <p>
          <strong>Μη αναστρέψιμη.</strong> Σβήνονται: {ERASED_TEXT}
        </p>
        <p className="muted">Μένουν: {KEPT_TEXT}</p>
        <div className="ml-field">
          <label htmlFor="n1-anon-name">Γράψε «{name}» για επιβεβαίωση</label>
          <input
            id="n1-anon-name"
            className="input"
            name="typedName"
            autoComplete="off"
            value={typed}
            onChange={(event) => setTyped(event.target.value)}
          />
        </div>
        {state.error && (
          <p className="g-warn" role="alert">
            {state.error}
          </p>
        )}
        <div className="ml-actions">
          <BackControl backHref={backHref} onCancel={onCancel} label="Άκυρο" />
          <button
            type="submit"
            data-danger
            disabled={isPending || typed.trim() !== name.trim()}
          >
            {isPending ? "Ανωνυμοποίηση…" : "Ανωνυμοποίηση οριστικά"}
          </button>
        </div>
        <p className="g-note">
          Το κουμπί ενεργοποιείται όταν το όνομα ταιριάζει ακριβώς.
        </p>
      </form>
    </GdprConfirmCard>
  );
}
