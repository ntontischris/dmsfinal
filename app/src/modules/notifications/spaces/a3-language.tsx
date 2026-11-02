"use client";

import { useActionState } from "react";

import { INITIAL_FORM_STATE } from "@/lib/form-state";

import { saveLanguage } from "../actions-language";
import { LANGUAGE_HINT, LANGUAGE_OPTIONS } from "../labels";
import type { EmailLanguage } from "../queries";

// «Γλώσσα» του A3 (prototype `PreferencesCard` του `screens/a3-account.tsx`): ένα κουμπί ανά γλώσσα, η τρέχουσα
// σημειωμένη. Ίδιο action με την κλασική φόρμα (set_my_language, μόνο για Χρήστη πελάτη).
export function SpacesLanguageChoice({ current }: { current: EmailLanguage }) {
  const [state, action, isPending] = useActionState(
    saveLanguage,
    INITIAL_FORM_STATE,
  );
  return (
    <form action={action}>
      <div className="a3-choice">
        {LANGUAGE_OPTIONS.map((option) => (
          <button
            key={option.value}
            className="button"
            type="submit"
            name="language"
            value={option.value}
            aria-current={option.value === current}
            disabled={isPending}
          >
            {option.label}
          </button>
        ))}
      </div>
      <p className="muted">{LANGUAGE_HINT}</p>
      {state.error && (
        <p className="note" role="alert">
          {state.error}
        </p>
      )}
      {state.notice && (
        <p className="note" role="status">
          {state.notice}
        </p>
      )}
    </form>
  );
}
