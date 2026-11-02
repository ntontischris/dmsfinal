"use client";

import Link from "next/link";
import { useState } from "react";

import { useKeptForm } from "@/lib/use-kept-form";
import { Panel } from "@/spaces/kit/panel";

import { anonymizeSubject } from "../actions";
import { ERASED_TEXT, KEPT_TEXT } from "../labels";
import type { PersonKind } from "../schemas";

interface AnonymizeConfirmProps {
  subjectKind: PersonKind;
  subjectId: string;
  name: string;
  backHref: string;
}

// Η επιβεβαίωση της Ανωνυμοποίησης (prototype `screens/n1-gdpr.tsx`), με την πραγματική ενέργεια. Το κουμπί ανοίγει
// μόνο όταν το όνομα ταιριάζει ακριβώς· η βάση το ξαναελέγχει.
export function AnonymizeConfirm({
  subjectKind,
  subjectId,
  name,
  backHref,
}: AnonymizeConfirmProps) {
  const { state, isPending, onSubmit, formRef } = useKeptForm(anonymizeSubject);
  const [typed, setTyped] = useState("");
  if (state.notice)
    return (
      <div className="n1-danger" role="status">
        <Panel label={`Ανωνυμοποίηση: ${name}`}>
          <p>{state.notice}</p>
          <Link className="button" href={backHref}>
            Πίσω στον Χρήστη
          </Link>
        </Panel>
      </div>
    );
  return (
    <div className="n1-danger">
      <Panel label={`Ανωνυμοποίηση: ${name}`}>
        <form ref={formRef} onSubmit={onSubmit}>
          <input type="hidden" name="subjectKind" value={subjectKind} />
          <input type="hidden" name="subjectId" value={subjectId} />
          <p>
            <strong>Μη αναστρέψιμη.</strong> Σβήνονται: {ERASED_TEXT}
          </p>
          <p className="muted">Μένουν: {KEPT_TEXT}</p>
          <div className="n1-field">
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
            <p className="note" role="alert">
              {state.error}
            </p>
          )}
          <div className="btn-row n1-section">
            <button
              type="submit"
              className="button"
              data-danger
              disabled={isPending || typed.trim() !== name.trim()}
            >
              {isPending ? "Ανωνυμοποίηση…" : "Ανωνυμοποίηση οριστικά"}
            </button>
            <Link className="button" href={backHref}>
              Άκυρο
            </Link>
          </div>
          <p className="note">
            Το κουμπί ενεργοποιείται όταν το όνομα ταιριάζει ακριβώς.
          </p>
        </form>
      </Panel>
    </div>
  );
}
